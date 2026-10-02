import type { AppSettings, NewPhotoEntry, PhotoEntry, PhotoEntryPatch } from '@/models';

/**
 * Platform-neutral persistence contracts. Native implements them with SQLite + files
 * (PhotoRepository.ts / SettingsRepository.ts), web with IndexedDB (*.web.ts).
 * A future cloud-sync layer can wrap either without touching ViewModels.
 */
export interface PhotoRepositoryState {
  photos: readonly PhotoEntry[];
  isLoaded: boolean;
}

export interface IPhotoRepository {
  subscribe(listener: () => void): () => void;
  getSnapshot(): PhotoRepositoryState;
  load(): Promise<void>;
  getById(id: string): PhotoEntry | undefined;
  /** Idempotent per id; persists the image from `sourceUri` then the metadata. */
  create(input: NewPhotoEntry): Promise<PhotoEntry>;
  /** Writes only patched fields; updates are serialized. */
  update(id: string, patch: PhotoEntryPatch): Promise<PhotoEntry>;
  remove(id: string): Promise<void>;
  removeAll(): Promise<void>;
}

export interface ISettingsRepository {
  subscribe(listener: () => void): () => void;
  getSnapshot(): AppSettings;
  load(): Promise<void>;
  update(patch: Partial<AppSettings>): Promise<void>;
}
