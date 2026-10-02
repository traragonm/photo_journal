import type { PhotoEntry } from '@/models';
import {
  buildManifest,
  exportFolderName,
  imageFileNameFor,
  type DiaryExportManifest,
  type ExportResult,
} from './exportManifest';

export * from './exportManifest';

const JSON_MIME = 'application/json';
const JSON_INDENT = 2;
/** Delay before revoking the download URL so the browser can start the download. */
const REVOKE_DELAY_MS = 10_000;

/** The web export is one self-contained file: the manifest plus every image as a data URL. */
export interface WebDiaryExport extends DiaryExportManifest {
  images: Record<string, string>;
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Unexpected FileReader result.'));
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not read image.'));
    reader.readAsDataURL(blob);
  });
}

async function imageToDataUrl(photo: PhotoEntry): Promise<string> {
  const response = await fetch(photo.imageUri);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const blob = await response.blob();
  if (blob.size === 0) throw new Error('empty image');
  return blobToDataUrl(blob);
}

function triggerDownload(content: string, fileName: string): void {
  const url = URL.createObjectURL(new Blob([content], { type: JSON_MIME }));
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), REVOKE_DELAY_MS);
}

/**
 * Exports the diary as a single `photo-diary-YYYYMMDD-HHMMSS.json` browser download.
 * Nothing is uploaded; the file lands wherever the browser saves downloads.
 */
export const ExportService = {
  async exportDiary(
    photos: readonly PhotoEntry[],
    onProgress?: (done: number, total: number) => void,
  ): Promise<ExportResult> {
    const now = new Date();
    const fileName = `${exportFolderName(now)}.json`;
    const images: Record<string, string> = {};
    const exportedIds = new Set<string>();
    let skippedCount = 0;

    const available = photos.filter((photo) => photo.isImageAvailable);
    skippedCount += photos.length - available.length;
    for (let i = 0; i < available.length; i++) {
      const photo = available[i];
      onProgress?.(i, available.length);
      try {
        images[imageFileNameFor(photo)] = await imageToDataUrl(photo);
        exportedIds.add(photo.id);
      } catch (error) {
        console.warn('[ExportService] skipped image', photo.id, error);
        skippedCount++;
      }
    }
    onProgress?.(available.length, available.length);

    const payload: WebDiaryExport = { ...buildManifest(photos, exportedIds, now), images };
    triggerDownload(JSON.stringify(payload, null, JSON_INDENT), fileName);

    return { status: 'done', destination: fileName, imageCount: exportedIds.size, skippedCount };
  },
};
