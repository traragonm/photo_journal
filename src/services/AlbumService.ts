import { File } from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { FrameColor, PhotoEntry } from '@/models';
import {
  ALBUM_EMPTY_MESSAGE,
  ALBUM_TITLE,
  buildAlbumHtml,
  toAlbumPrint,
  toDataUrl,
  type AlbumPrint,
} from './albumHtml';
import type { AlbumResult } from './albumTypes';

export type { AlbumResult } from './albumTypes';

const PDF_MIME = 'application/pdf';
const PDF_UTI = 'com.adobe.pdf';
const SHARE_DIALOG_TITLE = 'Xuất album';
/** US Letter at 72 PPI (expo-print default), spelled out so the page size is explicit. */
const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;

/**
 * Builds a PDF album (all prints as Polaroids) and hands it to the share sheet
 * (Save to Files / AirDrop / print). Nothing is uploaded by the app.
 * Images are embedded as base64, so very large diaries use a lot of memory.
 */
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
        const base64 = await new File(available[i].imageUri).base64();
        prints.push(toAlbumPrint(available[i], toDataUrl(base64)));
      } catch (error) {
        console.warn('[AlbumService] skipped image', available[i].id, error);
        skippedCount++;
      }
    }
    onProgress?.(available.length, available.length);
    if (prints.length === 0) return { status: 'empty' };

    const html = buildAlbumHtml(prints, {
      frameColor,
      title: ALBUM_TITLE,
      emptyMessage: ALBUM_EMPTY_MESSAGE,
    });
    const pdf = await Print.printToFileAsync({ html, width: PAGE_WIDTH, height: PAGE_HEIGHT });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(pdf.uri, {
        mimeType: PDF_MIME,
        UTI: PDF_UTI,
        dialogTitle: SHARE_DIALOG_TITLE,
      });
      return { status: 'done', printCount: prints.length, skippedCount, pageCount: pdf.numberOfPages };
    }
    // No share sheet on this device: fall back to the system print dialog (which can also save a PDF).
    await Print.printAsync({ uri: pdf.uri });
    return { status: 'done', printCount: prints.length, skippedCount, pageCount: pdf.numberOfPages };
  },
};
