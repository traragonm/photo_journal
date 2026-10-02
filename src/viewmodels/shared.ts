import { useCallback, useSyncExternalStore } from 'react';
import { DEFAULT_SETTINGS, type AppSettings, type PhotoEntry } from '@/models';
import type { PhotoRepositoryState } from '@/data/contracts';
import { useAppServices, useOptionalAppServices } from '@/services/AppServices';
import { frameColors, type FrameColorStyle } from '@/theme';

/** Subscribes to the photo repository (newest-first list). */
export function usePhotoStore(): PhotoRepositoryState {
  const { photoRepository } = useAppServices();
  return useSyncExternalStore(photoRepository.subscribe, photoRepository.getSnapshot);
}

/** Single photo by id; `undefined` once deleted or if the id is unknown. */
export function usePhoto(id: string | undefined): PhotoEntry | undefined {
  const { photos } = usePhotoStore();
  return id ? photos.find((photo) => photo.id === id) : undefined;
}

/** Current settings + a typed updater. */
export function useSettings(): {
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
} {
  const { settingsRepository } = useAppServices();
  const settings = useSyncExternalStore(settingsRepository.subscribe, settingsRepository.getSnapshot);
  const updateSettings = useCallback(
    (patch: Partial<AppSettings>) => settingsRepository.update(patch),
    [settingsRepository],
  );
  return { settings, updateSettings };
}

const noopSubscribe = () => () => undefined;

/** Reads settings without requiring the provider (falls back to defaults, e.g. on the boot error screen). */
function useOptionalSettings(): AppSettings {
  const repository = useOptionalAppServices()?.settingsRepository;
  return useSyncExternalStore(repository?.subscribe ?? noopSubscribe, () =>
    repository ? repository.getSnapshot() : DEFAULT_SETTINGS,
  );
}

export interface FrameStyle {
  /** Border colours of prints (Settings › Màu viền). */
  frame: FrameColorStyle;
  /** Caption text style: handwritten (Patrick Hand) or the UI font (Settings toggle). */
  captionVariant: 'hand' | 'bodyMedium';
}

/** How prints look, from Settings › Khung ảnh / Nhật ký. */
export function useFrameStyle(): FrameStyle {
  const settings = useOptionalSettings();
  return {
    frame: frameColors[settings.frameColor],
    captionVariant: settings.handwriting ? 'hand' : 'bodyMedium',
  };
}
