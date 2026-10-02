import { ActivityIndicator, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, fontSizes, layout, spacing } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

export interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  icon?: keyof typeof Ionicons.glyphMap;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}

const VARIANTS: Record<ButtonVariant, { bg: string; fg: string }> = {
  primary: { bg: colors.ink, fg: colors.onInk },
  accent: { bg: colors.accent, fg: colors.white },
  secondary: { bg: colors.chip, fg: colors.ink },
  ghost: { bg: colors.transparent, fg: colors.accentText },
  danger: { bg: colors.transparent, fg: colors.danger },
};
const ICON_SIZE = fontSizes.lg;
const DISABLED_OPACITY = 0.45;

/** Calm pill button (ink on paper). */
export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  disabled = false,
  loading = false,
  style,
  accessibilityHint,
}: ButtonProps) {
  const { bg, fg } = VARIANTS[variant];
  const inactive = disabled || loading;
  return (
    <PressableScale
      onPress={onPress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={[styles.base, { backgroundColor: bg }, inactive && styles.disabled, style]}
    >
      <View style={styles.content}>
        {loading ? (
          <ActivityIndicator color={fg} />
        ) : (
          <>
            {icon ? <Ionicons name={icon} size={ICON_SIZE} color={fg} /> : null}
            <AppText variant="label" style={{ color: fg }}>
              {label}
            </AppText>
          </>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouch,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.xl,
    justifyContent: 'center',
    alignSelf: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});
