import * as Sharing from 'expo-sharing';

export type ShareResult = 'shared' | 'unsupported';

const SHARE_FILE_NAME = 'nhat-ky-anh.jpg';
const SHARE_TITLE = 'Nhật ký ảnh';

/** Web: expo-sharing when available, else the Web Share API (file first, link as a fallback). */
export async function sharePhoto(uri: string): Promise<ShareResult> {
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'image/jpeg', dialogTitle: 'Chia sẻ ảnh' });
    return 'shared';
  }
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return 'unsupported';
  try {
    const blob = await (await fetch(uri)).blob();
    const file = new File([blob], SHARE_FILE_NAME, { type: blob.type || 'image/jpeg' });
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: SHARE_TITLE });
      return 'shared';
    }
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') return 'shared';
  }
  if (uri.startsWith('http')) {
    await navigator.share({ url: uri, title: SHARE_TITLE });
    return 'shared';
  }
  return 'unsupported';
}