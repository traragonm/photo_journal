import { Directory, File } from 'expo-file-system';
import type { PhotoEntry } from '@/models';
import { buildManifest, imageFileNameFor, exportFolderName, type ExportResult } from './exportManifest';

export * from './exportManifest';

const JSON_MIME = 'application/json';
const JPEG_MIME = 'image/jpeg';
const JSON_INDENT = 2;

function isPickerCancellation(error: unknown): boolean {
  const code = (error as { code?: unknown } | null)?.code;
  const message = error instanceof Error ? error.message : '';
  return /cancel/i.test(typeof code === 'string' ? code : '') || /cancel/i.test(message);
}

/**
 * Exports the diary to a folder the user picks (Files on iOS, any SAF location on Android):
 * `<picked>/photo-diary-YYYYMMDD-HHMMSS/{diary.json, <id>.jpg…}`.
 * Nothing is uploaded — the user decides where the copy goes.
 */
export const ExportService = {
  async exportDiary(
    photos: readonly PhotoEntry[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<ExportResult> {
    let target: Directory;
    try {
      target = await Directory.pickDirectoryAsync();
    } catch (error) {
      if (isPickerCancellation(error)) return { status: 'cancelled' };
      throw error;
    }

    const now = new Date();
    const folderName = exportFolderName(now);
    const folder = target.createDirectory(folderName);
    const exportedIds = new Set<string>();
    let skippedCount = 0;

    const available = photos.filter((photo) => photo.isImageAvailable);
    skippedCount += photos.length - available.length;
    for (let i = 0; i < available.length; i++) {
      const photo = available[i];
      onProgress?.(i, available.length);
      try {
        const bytes = await new File(photo.imageUri).bytes();
        folder.createFile(imageFileNameFor(photo), JPEG_MIME).write(bytes);
        exportedIds.add(photo.id);
      } catch (error) {
        console.warn('[ExportService] skipped image', photo.id, error);
        skippedCount++;
      }
    }
    onProgress?.(available.length, available.length);

    const manifest = buildManifest(photos, exportedIds, now);
    folder.createFile('diary.json', JSON_MIME).write(JSON.stringify(manifest, null, JSON_INDENT));

    return { status: 'done', destination: folderName, imageCount: exportedIds.size, skippedCount };
  },
};
