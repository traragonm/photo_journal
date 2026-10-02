import {
  toFilmFilter,
  toFrameType,
  type CameraType,
  type FilmFilter,
  type FrameType,
  type NewPhotoEntry,
  type PhotoEntry,
  type PhotoEntryPatch,
} from '@/models';
import type { IPhotoRepository, PhotoRepositoryState } from '../contracts';
import { Observable } from '../Observable';
import { dbClear, dbDelete, dbGetAll, dbPut, dbUpdate, PHOTOS_STORE } from './indexedDb';

/**
 * Persisted shape: metadata plus raw image bytes. Bytes (not a Blob) are stored because Blob
 * support inside IndexedDB is unreliable in some browsers (older Safari) and in test shims.
 */
interface PhotoRecord {
  id: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  caption: string | null;
  cameraType: CameraType;
  /** Optional: records written before v2 lack these. */
  frameType?: FrameType;
  filter?: FilmFilter;
  width: number | null;
  height: number | null;
  imageBytes: ArrayBuffer | null;
  mimeType: string;
  updatedAt: string;
}

const PATCH_FIELDS: readonly (keyof PhotoEntryPatch)[] = ['caption', 'locationName'];

function toCameraType(value: string): CameraType {
  return value === 'front' ? 'front' : 'back';
}

/** Duck-typed (not instanceof) so records survive cross-realm structured cloning. */
function hasImage(record: PhotoRecord): record is PhotoRecord & { imageBytes: ArrayBuffer } {
  const bytes: unknown = record.imageBytes;
  if (typeof bytes !== 'object' || bytes === null) return false;
  const { byteLength } = bytes as { byteLength?: unknown };
  return typeof byteLength === 'number' && byteLength > 0;
}

/** Local-first IndexedDB repository for the web build. Photos are kept newest-first. */
export class WebPhotoRepository extends Observable<PhotoRepositoryState> implements IPhotoRepository {
  protected snapshot: PhotoRepositoryState = { photos: [], isLoaded: false };

  /** One object URL per photo id, revoked on remove/removeAll. */
  private objectUrls = new Map<string, string>();

  private objectUrlFor(id: string, bytes: ArrayBuffer, mimeType: string): string {
    const cached = this.objectUrls.get(id);
    if (cached) return cached;
    const url = URL.createObjectURL(new Blob([bytes], { type: mimeType }));
    this.objectUrls.set(id, url);
    return url;
  }

  private revokeUrl(id: string): void {
    const url = this.objectUrls.get(id);
    if (url === undefined) return;
    URL.revokeObjectURL(url);
    this.objectUrls.delete(id);
  }

  private toEntry(record: PhotoRecord): PhotoEntry {
    const available = hasImage(record);
    return {
      id: record.id,
      imageUri: available ? this.objectUrlFor(record.id, record.imageBytes, record.mimeType) : '',
      createdAt: record.createdAt,
      latitude: record.latitude,
      longitude: record.longitude,
      locationName: record.locationName,
      caption: record.caption,
      cameraType: toCameraType(record.cameraType),
      frameType: toFrameType(record.frameType),
      filter: toFilmFilter(record.filter),
      width: record.width,
      height: record.height,
      isImageAvailable: available,
    };
  }

  private emit(photos: readonly PhotoEntry[]): void {
    this.setSnapshot({ photos, isLoaded: true });
  }

  async load(): Promise<void> {
    const records = await dbGetAll<PhotoRecord>(PHOTOS_STORE);
    const entries = records
      .map((record) => this.toEntry(record))
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const liveIds = new Set(entries.map((entry) => entry.id));
    for (const id of [...this.objectUrls.keys()]) {
      if (!liveIds.has(id)) this.revokeUrl(id);
    }
    this.emit(entries);
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

  /** Reads the captured image (data:/blob:/http URL) into a Blob. */
  private async readImage(sourceUri: string): Promise<Blob> {
    let blob: Blob;
    try {
      const response = await fetch(sourceUri);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      blob = await response.blob();
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not read the captured photo (${reason}).`);
    }
    if (blob.size === 0) throw new Error('The captured photo is empty.');
    return blob;
  }

  private async insert(input: NewPhotoEntry): Promise<PhotoEntry> {
    const image = await this.readImage(input.sourceUri);
    const record: PhotoRecord = {
      id: input.id,
      createdAt: input.createdAt,
      latitude: input.latitude,
      longitude: input.longitude,
      locationName: input.locationName,
      caption: input.caption,
      cameraType: input.cameraType,
      frameType: input.frameType,
      filter: input.filter,
      width: input.width,
      height: input.height,
      imageBytes: await image.arrayBuffer(),
      mimeType: image.type,
      updatedAt: new Date().toISOString(),
    };
    await dbPut(PHOTOS_STORE, record);

    const entry = this.toEntry(record);
    const photos = [entry, ...this.snapshot.photos].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    );
    this.emit(photos);
    return entry;
  }

  /**
   * Writes only the patched fields, serialized through a queue so overlapping
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
    const stored = await dbUpdate<PhotoRecord>(PHOTOS_STORE, id, (current) => {
      const next: PhotoRecord = { ...current };
      let changed = false;
      for (const field of PATCH_FIELDS) {
        const value = patch[field];
        if (value !== undefined) {
          next[field] = value;
          changed = true;
        }
      }
      if (changed) next.updatedAt = new Date().toISOString();
      return next;
    });
    if (stored === undefined) throw new Error(`Photo ${id} was deleted.`);
    // Merge into the latest snapshot (not the one from call time).
    const latest = this.getById(id);
    if (!latest) throw new Error(`Photo ${id} was deleted.`);
    const next: PhotoEntry = { ...latest, ...patch };
    this.emit(this.snapshot.photos.map((photo) => (photo.id === id ? next : photo)));
    return next;
  }
  async remove(id: string): Promise<void> {
    await dbDelete(PHOTOS_STORE, id);
    this.revokeUrl(id);
    this.emit(this.snapshot.photos.filter((photo) => photo.id !== id));
  }

  async removeAll(): Promise<void> {
    await dbClear(PHOTOS_STORE);
    for (const id of [...this.objectUrls.keys()]) this.revokeUrl(id);
    this.emit([]);
  }
}
