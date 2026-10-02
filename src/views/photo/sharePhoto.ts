import * as Sharing from 'expo-sharing';

export type ShareResult = 'shared' | 'unsupported';

/** Opens the system share sheet for the photo file (native). */
export async function sharePhoto(uri: string): Promise<ShareResult> {
  if (!(await Sharing.isAvailableAsync())) return 'unsupported';
  await Sharing.shareAsync(uri, {
    mimeType: 'image/jpeg',
    UTI: 'public.jpeg',
    dialogTitle: 'Chia sẻ ảnh',
  });
  return 'shared';
}