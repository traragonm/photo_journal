import type { PhotoEntry } from '@/models';

/** Platform-neutral export helpers shared by the native and web ExportService. */

export const EXPORT_FORMAT_VERSION = 1;

export interface DiaryExportEntry {
  id: string;
  createdAt: string;
  caption: string | null;
  locationName: string | null;
  latitude: number | null;
  longitude: number | null;
  cameraType: PhotoEntry['cameraType'];
  /** Image file name inside the export folder; null if the original was missing. */
  imageFile: string | null;
}

export interface DiaryExportManifest {
  format: 'photo-diary';
  version: typeof EXPORT_FORMAT_VERSION;
  exportedAt: string;
  entries: DiaryExportEntry[];
}

export type ExportResult =
  | { status: 'cancelled' }
  /** `destination`: human-readable place the copy went (folder name / downloaded file). */
  | { status: 'done'; destination: string; imageCount: number; skippedCount: number };

const pad2 = (value: number) => String(value).padStart(2, '0');

/** "photo-diary-20261002-183000" (local time). */
export function exportFolderName(now: Date): string {
  const date = `${now.getFullYear()}${pad2(now.getMonth() + 1)}${pad2(now.getDate())}`;
  const time = `${pad2(now.getHours())}${pad2(now.getMinutes())}${pad2(now.getSeconds())}`;
  return `photo-diary-${date}-${time}`;
}

export function imageFileNameFor(photo: Pick<PhotoEntry, 'id'>): string {
  return `${photo.id}.jpg`;
}

/** Pure: builds the manifest written as diary.json. */
export function buildManifest(
  photos: readonly PhotoEntry[],
  exportedImageIds: ReadonlySet<string>,
  now: Date,
): DiaryExportManifest {
  return {
    format: 'photo-diary',
    version: EXPORT_FORMAT_VERSION,
    exportedAt: now.toISOString(),
    entries: photos.map((photo) => ({
      id: photo.id,
      createdAt: photo.createdAt,
      caption: photo.caption,
      locationName: photo.locationName,
      latitude: photo.latitude,
      longitude: photo.longitude,
      cameraType: photo.cameraType,
      imageFile: exportedImageIds.has(photo.id) ? imageFileNameFor(photo) : null,
    })),
  };
}
