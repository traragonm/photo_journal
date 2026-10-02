import { Modal, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton, PhotoImage } from '@/components';
import type { PhotoEntry } from '@/models';
import { colors, spacing } from '@/theme';

export interface FullPhotoViewerProps {
  photo: PhotoEntry;
  visible: boolean;
  onClose: () => void;
}

/** Full-screen, uncropped view of the photo (film look applied) on a dark background. */
export function FullPhotoViewer({ photo, visible, onClose }: FullPhotoViewerProps) {
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={styles.backdrop}>
        <PhotoImage
          uri={photo.imageUri}
          isAvailable={photo.isImageAvailable}
          filter={photo.filter}
          contentFit="contain"
          style={styles.image}
          accessibilityLabel="Ảnh toàn màn hình"
        />
        <View style={[styles.close, { top: insets.top + spacing.sm }]}>
          <IconButton icon="close" tone="camera" accessibilityLabel="Đóng ảnh" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.cameraBody, justifyContent: 'center' },
  image: { flex: 1, backgroundColor: colors.cameraBody },
  close: { position: 'absolute', right: spacing.lg },
});