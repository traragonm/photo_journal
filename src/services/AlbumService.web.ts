import type { FrameColor, PhotoEntry } from '@/models';
import {
  ALBUM_EMPTY_MESSAGE,
  ALBUM_TITLE,
  buildAlbumHtml,
  toAlbumPrint,
  type AlbumPrint,
} from './albumHtml';
import type { AlbumResult } from './albumTypes';

export type { AlbumResult } from './albumTypes';

/** Time to let the iframe lay out images before opening the print dialog. */
const LAYOUT_SETTLE_MS = 300;
/** Fallback cleanup if `afterprint` never fires (some browsers). */
const CLEANUP_FALLBACK_MS = 120_000;

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

/**
 * Prints the album from a hidden iframe so the browser's print dialog ("Save as PDF") shows only the
 * album, not the app. (expo-print's web `printAsync` ignores `html` and prints the current page.)
 */
function printHtmlInIframe(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.position = 'fixed';
    frame.style.right = '0';
    frame.style.bottom = '0';
    frame.style.width = '0';
    frame.style.height = '0';
    frame.style.border = '0';
    const cleanup = () => frame.remove();
    frame.onload = () => {
      const view = frame.contentWindow;
      if (!view) {
        cleanup();
        reject(new Error('Không mở được cửa sổ in.'));
        return;
      }
      setTimeout(() => {
        view.addEventListener('afterprint', cleanup);
        setTimeout(cleanup, CLEANUP_FALLBACK_MS);
        view.focus();
        view.print();
        resolve();
      }, LAYOUT_SETTLE_MS);
    };
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });
}

/** Web album export: embeds images and opens the browser print dialog (choose "Save as PDF"). */
export const AlbumService = {
  async exportAlbum(
    photos: readonly PhotoEntry[],
    frameColor: FrameColor,
    onProgress?: (done: number, total: number) => void,
  ): Promise<AlbumResult> {
    const available = photos.filter((photo) => photo.isImageAvailable);
    let skippedCount = photos.length - available.length;
    const prints: AlbumPrint[] = [];

    for (let i = 0; i < available.length; i++) {
      onProgress?.(i, available.length);
      try {
        prints.push(toAlbumPrint(available[i], await imageToDataUrl(available[i])));
      } catch (error) {
        console.warn('[AlbumService] skipped image', available[i].id, error);
        skippedCount++;
      }
    }
    onProgress?.(available.length, available.length);
    if (prints.length === 0) return { status: 'empty' };

    await printHtmlInIframe(
      buildAlbumHtml(prints, { frameColor, title: ALBUM_TITLE, emptyMessage: ALBUM_EMPTY_MESSAGE }),
    );
    return { status: 'done', printCount: prints.length, skippedCount };
  },
};
