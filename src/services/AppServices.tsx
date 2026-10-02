import { createContext, useContext, type ReactNode } from 'react';
import type { IPhotoRepository, ISettingsRepository } from '@/data/contracts';
import { createRepositories } from './createRepositories';

/**
 * Dependency container for the Model layer. Created once at startup and
 * passed down via context (no module-level singletons), so tests, the web build
 * and a future cloud-sync layer can swap implementations.
 */
export interface AppServices {
  photoRepository: IPhotoRepository;
  settingsRepository: ISettingsRepository;
}

export async function createAppServices(): Promise<AppServices> {
  // Metro picks createRepositories.web.ts on web, createRepositories.ts on iOS/Android.
  const { photoRepository, settingsRepository } = await createRepositories();
  await Promise.all([photoRepository.load(), settingsRepository.load()]);
  return { photoRepository, settingsRepository };
}

const AppServicesContext = createContext<AppServices | null>(null);

export function AppServicesProvider({
  services,
  children,
}: {
  services: AppServices;
  children: ReactNode;
}) {
  return <AppServicesContext.Provider value={services}>{children}</AppServicesContext.Provider>;
}

/** Services if mounted inside the provider, otherwise null (e.g. the boot error screen). */
export function useOptionalAppServices(): AppServices | null {
  return useContext(AppServicesContext);
}

export function useAppServices(): AppServices {
  const services = useContext(AppServicesContext);
  if (!services) throw new Error('useAppServices must be used inside <AppServicesProvider>.');
  return services;
}
