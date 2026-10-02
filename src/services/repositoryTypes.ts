import type { IPhotoRepository, ISettingsRepository } from '@/data/contracts';

/** What each platform's `createRepositories()` must return (not yet loaded). */
export interface Repositories {
  photoRepository: IPhotoRepository;
  settingsRepository: ISettingsRepository;
}
