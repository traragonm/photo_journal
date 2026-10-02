import { StyleSheet, View } from 'react-native';
import { AppText, Button, PolaroidFrame } from '@/components';
import { colors, frameColors, layout, spacing } from '@/theme';
import { cameraColors } from './cameraTokens';

const BLANK_PRINT_WIDTH = 168;
const BLANK_PRINT_TILT = -4;

export interface CameraPermissionViewProps {
  /** Permanently denied: the OS won't ask again, so the button opens system Settings. */
  isBlocked: boolean;
  onEnable: () => void;
}

/** Shown on the camera body when camera access hasn't been granted: a blank print and one action. */
export function CameraPermissionView({ isBlocked, onEnable }: CameraPermissionViewProps) {
  return (
    <View style={styles.container}>
      <View importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <PolaroidFrame
          width={BLANK_PRINT_WIDTH}
          frameType="square"
          colorStyle={frameColors.white}
          rotation={BLANK_PRINT_TILT}
          shadow="viewfinder"
          image={<View style={styles.blank} />}
        />
      </View>
      <AppText variant="subheading" align="center" style={styles.title}>
        Camera là cách nhật ký của bạn sống dậy.
      </AppText>
      <AppText variant="body" align="center" color="onInkMuted">
        {isBlocked
          ? 'Quyền camera đang tắt. Bật lại trong Cài đặt — ảnh không bao giờ rời khỏi máy.'
          : 'Ảnh chỉ nằm trên máy này. Không tải lên đâu cả.'}
      </AppText>
      <Button
        label={isBlocked ? 'Mở cài đặt' : 'Bật camera'}
        variant="accent"
        icon={isBlocked ? 'settings-outline' : 'camera-outline'}
        onPress={onEnable}
        accessibilityHint={isBlocked ? 'Mở cài đặt hệ thống để cho phép camera' : 'Hỏi quyền dùng camera'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: layout.edgeTabTouchWidth + spacing.lg,
    backgroundColor: colors.cameraBody,
  },
  blank: {
    flex: 1,
    backgroundColor: cameraColors.viewfinderEmpty,
  },
  title: {
    color: colors.onInk,
    marginTop: spacing.lg,
  },
});
