import { ImageStorage, LocalPhotoRepository, LocalSettingsRepository, openDatabase } from '@/data';
import type { Repositories } from './repositoryTypes';

/**
 * Native (iOS/Android): SQLite metadata + image files in the document directory.
 * The web build resolves `createRepositories.web.ts` instead (IndexedDB).
 */
export async function createRepositories(): Promise<Repositories> {
  const db = await openDatabase();
  const imageStorage = new ImageStorage();
  return {
    photoRepository: new LocalPhotoRepository(db, imageStorage),
    settingsRepository: new LocalSettingsRepository(db),
  };
}
