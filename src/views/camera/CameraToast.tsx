import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText, PressableScale } from '@/components';
import { borderRadius, colors, durations, fontSizes, shadows, spacing } from '@/theme';
import type { CameraToast as CameraToastModel } from '@/viewmodels/useCameraViewModel';
import { cameraColors } from './cameraTokens';

export interface CameraToastProps {
  toast: CameraToastModel;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Small, non-blocking message pill. Tap to dismiss; it also hides itself. */
export function CameraToast({ toast, onDismiss, style }: CameraToastProps) {
  const isError = toast.tone === 'error';
  return (
    <Animated.View
      key={toast.id}
      entering={FadeInUp.duration(durations.fast)}
      exiting={FadeOutUp.duration(durations.fast)}
      style={[styles.wrapper, style]}
      accessibilityLiveRegion="polite"
    >
      <PressableScale
        onPress={onDismiss}
        accessibilityRole="alert"
        accessibilityLabel={toast.message}
        accessibilityHint="Chạm để ẩn"
        style={[styles.toast, shadows.float]}
      >
        <Ionicons
          name={isError ? 'alert-circle-outline' : 'checkmark-circle-outline'}
          size={fontSizes.lg}
          color={isError ? colors.accent : colors.ink}
        />
        <AppText variant="bodyMedium" style={styles.text}>
          {toast.message}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    alignItems: 'center',
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.card,
    backgroundColor: cameraColors.toastBackground,
  },
  text: {
    flexShrink: 1,
    color: cameraColors.toastText,
  },
});
