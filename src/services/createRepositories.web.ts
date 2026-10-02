import { openDatabase } from '@/data/web/indexedDb';
import { WebPhotoRepository } from '@/data/web/WebPhotoRepository';
import { WebSettingsRepository } from '@/data/web/WebSettingsRepository';
import type { Repositories } from './repositoryTypes';

/**
 * Web: IndexedDB metadata + image Blobs. Opening the database up front surfaces
 * "storage unavailable" errors at boot (where the retry screen handles them).
 */
export async function createRepositories(): Promise<Repositories> {
  await openDatabase();
  return {
    photoRepository: new WebPhotoRepository(),
    settingsRepository: new WebSettingsRepository(),
  };
}
