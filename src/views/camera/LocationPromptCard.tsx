import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { AppText, Button } from '@/components';
import { borderRadius, colors, durations, fontSizes, shadows, spacing } from '@/theme';

export interface LocationPromptCardProps {
  onAllow: () => void;
  onDismiss: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Small, non-blocking card asking (once) to attach places to memories. */
export function LocationPromptCard({ onAllow, onDismiss, style }: LocationPromptCardProps) {
  return (
    <Animated.View
      entering={FadeInDown.duration(durations.normal)}
      exiting={FadeOutDown.duration(durations.fast)}
      style={[styles.card, shadows.float, style]}
      accessibilityRole="alert"
    >
      <View style={styles.header}>
        <Ionicons name="location-outline" size={fontSizes.lg} color={colors.accentText} />
        <AppText variant="bodyMedium" style={styles.title}>
          Ghi lại nơi khoảnh khắc này diễn ra.
        </AppText>
      </View>
      <AppText variant="caption" color="textMuted">
        Tuỳ chọn · vị trí chỉ lưu trên máy này
      </AppText>
      <View style={styles.actions}>
        <Button label="Để sau" variant="ghost" onPress={onDismiss} style={styles.button} />
        <Button
          label="Cho phép vị trí"
          onPress={onAllow}
          style={styles.button}
          accessibilityHint="Hỏi quyền truy cập vị trí"
        />
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.sheet,
    borderRadius: borderRadius.card,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  title: {
    flexShrink: 1,
    color: colors.ink,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  button: {
    alignSelf: 'auto',
    paddingHorizontal: spacing.lg,
  },
});
