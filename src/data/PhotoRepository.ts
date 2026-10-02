import type { SQLiteDatabase } from 'expo-sqlite';
import {
  toFilmFilter,
  toFrameType,
  type CameraType,
  type NewPhotoEntry,
  type PhotoEntry,
  type PhotoEntryPatch,
} from '@/models';
import { Observable } from './Observable';
import type { ImageStorage } from './ImageStorage';
import type { IPhotoRepository, PhotoRepositoryState } from './contracts';

interface PhotoRow {
  id: string;
  file_name: string;
  created_at: string;
  latitude: number | null;
  longitude: number | null;
  location_name: string | null;
  caption: string | null;
  camera_type: string;
  frame_type: string;
  filter: string;
  width: number | null;
  height: number | null;
}

export type { IPhotoRepository, PhotoRepositoryState };

/** Patchable fields → column names (fixed whitelist; never interpolate user input). */
const PATCH_COLUMNS: readonly (readonly [keyof PhotoEntryPatch, string])[] = [
  ['caption', 'caption'],
  ['locationName', 'location_name'],
];

function toCameraType(value: string): CameraType {
  return value === 'front' ? 'front' : 'back';
}

/** Local-first SQLite + file-system repository. Photos are kept newest-first. */
export class LocalPhotoRepository extends Observable<PhotoRepositoryState> implements IPhotoRepository {
  protected snapshot: PhotoRepositoryState = { photos: [], isLoaded: false };

  constructor(
    private readonly db: SQLiteDatabase,
    private readonly storage: ImageStorage,
  ) {
    super();
  }

  private toEntry(row: PhotoRow): PhotoEntry {
    return {
      id: row.id,
      imageUri: this.storage.resolveUri(row.file_name),
      createdAt: row.created_at,
      latitude: row.latitude,
      longitude: row.longitude,
      locationName: row.location_name,
      caption: row.caption,
      cameraType: toCameraType(row.camera_type),
      frameType: toFrameType(row.frame_type),
      filter: toFilmFilter(row.filter),
      width: row.width,
      height: row.height,
      isImageAvailable: this.storage.exists(row.file_name),
    };
  }

  private emit(photos: readonly PhotoEntry[]): void {
    this.setSnapshot({ photos, isLoaded: true });
  }

  async load(): Promise<void> {
    this.storage.ensureReady();
    const rows = await this.db.getAllAsync<PhotoRow>(
      'SELECT * FROM photos ORDER BY created_at DESC',
    );
    this.cleanupOrphanFiles(rows);
    this.emit(rows.map((row) => this.toEntry(row)));
  }

  /** Removes image files with no DB row (e.g. app killed between file copy and insert). */
  private cleanupOrphanFiles(rows: readonly PhotoRow[]): void {
    const known = new Set(rows.map((row) => row.file_name));
    for (const fileName of this.storage.listFileNames()) {
      if (!known.has(fileName)) {
        try {
          this.storage.delete(fileName);
        } catch (error) {
          console.warn('[PhotoRepository] orphan cleanup failed', fileName, error);
        }
      }
    }
  }

  getById(id: string): PhotoEntry | undefined {
    return this.snapshot.photos.find((photo) => photo.id === id);
  }

  /** In-flight creates by id, so a concurrent duplicate submit shares one write. */
  private pendingCreates = new Map<string, Promise<PhotoEntry>>();

  create(input: NewPhotoEntry): Promise<PhotoEntry> {
    const existing = this.getById(input.id);
    if (existing) return Promise.resolve(existing); // idempotent: duplicate submit of the same capture
    const pending = this.pendingCreates.get(input.id);
    if (pending) return pending;

    const run = this.insert(input).finally(() => this.pendingCreates.delete(input.id));
    this.pendingCreates.set(input.id, run);
    return run;
  }

  private async insert(input: NewPhotoEntry): Promise<PhotoEntry> {
    const fileName = await this.storage.persist(input.sourceUri, input.id);
    const now = new Date().toISOString();
    try {
      await this.db.runAsync(
        `INSERT OR IGNORE INTO photos
          (id, file_name, created_at, latitude, longitude, location_name, caption, camera_type, frame_type, filter, width, height, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        input.id,
        fileName,
        input.createdAt,
        input.latitude,
        input.longitude,
        input.locationName,
        input.caption,
        input.cameraType,
        input.frameType,
        input.filter,
        input.width,
        input.height,
        now,
      );
    } catch (error) {
      this.storage.delete(fileName);
      throw error;
    }

    const entry = this.toEntry({
      id: input.id,
      file_name: fileName,
      created_at: input.createdAt,
      latitude: input.latitude,
      longitude: input.longitude,
      location_name: input.locationName,
      caption: input.caption,
      camera_type: input.cameraType,
      frame_type: input.frameType,
      filter: input.filter,
      width: input.width,
      height: input.height,
    });
    const photos = [entry, ...this.snapshot.photos].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    this.emit(photos);
    return entry;
  }

  /**
   * Writes only the patched columns, serialized through a queue so overlapping
   * updates (e.g. caption save + background place-name lookup) never clobber each other.
   */
  update(id: string, patch: PhotoEntryPatch): Promise<PhotoEntry> {
    const run = this.writeQueue.then(() => this.applyUpdate(id, patch));
    this.writeQueue = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private writeQueue: Promise<void> = Promise.resolve();

  private async applyUpdate(id: string, patch: PhotoEntryPatch): Promise<PhotoEntry> {
    if (!this.getById(id)) throw new Error(`Photo ${id} not found.`);
    const assignments: string[] = [];
    const values: (string | null)[] = [];
    for (const [field, column] of PATCH_COLUMNS) {
      if (patch[field] !== undefined) {
        assignments.push(`${column} = ?`);
        values.push(patch[field] ?? null);
      }
    }
    if (assignments.length > 0) {
      await this.db.runAsync(
        `UPDATE photos SET ${assignments.join(', ')}, updated_at = ? WHERE id = ?`,
        ...values,
        new Date().toISOString(),
        id,
      );
    }
    // Merge into the latest snapshot (not the one from call time).
    const latest = this.getById(id);
    if (!latest) throw new Error(`Photo ${id} was deleted.`);
    const next: PhotoEntry = { ...latest, ...patch };
    this.emit(this.snapshot.photos.map((photo) => (photo.id === id ? next : photo)));
    return next;
  }

  async remove(id: string): Promise<void> {
    const row = await this.db.getFirstAsync<Pick<PhotoRow, 'file_name'>>(
      'SELECT file_name FROM photos WHERE id = ?',
      id,
    );
    await this.db.runAsync('DELETE FROM photos WHERE id = ?', id);
    if (row) {
      try {
        this.storage.delete(row.file_name);
      } catch (error) {
        // Row is gone; a leftover file is cleaned up as an orphan on next load.
        console.warn('[PhotoRepository] failed to delete file', error);
      }
    }
    this.emit(this.snapshot.photos.filter((photo) => photo.id !== id));
  }

  async removeAll(): Promise<void> {
    await this.db.runAsync('DELETE FROM photos');
    this.storage.deleteAll();
    this.emit([]);
  }
}
