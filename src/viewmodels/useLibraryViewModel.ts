import { useCallback, useMemo } from 'react';
import { router } from 'expo-router';
import type { PhotoEntry } from '@/models';
import { chunk, groupPhotosByMonth } from '@/utils/library';
import { usePhotoStore } from './shared';

export const LIBRARY_COLUMNS = 3;

export interface LibrarySection {
  key: string;
  title: string;
  count: number;
  /** Rows of up to LIBRARY_COLUMNS photos. */
  data: PhotoEntry[][];
}

export interface LibraryViewModel {
  isLoaded: boolean;
  total: number;
  subtitle: string;
  sections: LibrarySection[];
  goBack: () => void;
  openPhoto: (photo: PhotoEntry) => void;
}

/** State and actions of the photo library screen ("Thư viện"). */
export function useLibraryViewModel(): LibraryViewModel {
  const { photos, isLoaded } = usePhotoStore();
  const sections = useMemo(
    () =>
      groupPhotosByMonth(photos).map((group) => ({
        key: group.key,
        title: group.title,
        count: group.photos.length,
        data: chunk(group.photos, LIBRARY_COLUMNS),
      })),
    [photos],
  );
  const goBack = useCallback(() => {
    if (router.canGoBack()) router.back();
    else router.replace('/');
  }, []);
  const openPhoto = useCallback((photo: PhotoEntry) => {
    router.push({ pathname: '/photo/[id]', params: { id: photo.id } });
  }, []);
  return { isLoaded, total: photos.length, subtitle: `${photos.length} tấm ảnh`, sections, goBack, openPhoto };
}
