import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, fontSizes, layout, spacing } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export interface HandleProps {
  /** Hint under/over the grab bar ("Kéo lên · Lịch ảnh"). Omit for a bare bar. */
  label?: string;
  icon?: keyof typeof Ionicons.glyphMap;
  /** Bar above the label (top of a sheet) or below it (bottom edge of a page). */
  barPosition?: 'top' | 'bottom';
  onPress?: () => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
}

const ICON_SIZE = fontSizes.md;

/** Grab bar + hint, used at sheet edges. Tappable as an alternative to dragging. */
export function Handle({ label, icon, barPosition = 'top', onPress, accessibilityLabel, style }: HandleProps) {
  const bar = <View style={styles.bar} />;
  const text = label ? (
    <View style={styles.labelRow}>
      {icon ? <Ionicons name={icon} size={ICON_SIZE} color={colors.muted} /> : null}
      <AppText variant="caption" color="textMuted">
        {label}
      </AppText>
    </View>
  ) : null;
  const content = (
    <>
      {barPosition === 'top' ? bar : null}
      {text}
      {barPosition === 'bottom' ? bar : null}
    </>
  );
  if (!onPress) return <View style={[styles.container, style]}>{content}</View>;
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={[styles.container, style]}
    >
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    minHeight: layout.minTouch,
    justifyContent: 'center',
  },
  bar: {
    width: layout.handleWidth,
    height: layout.handleHeight,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.handle,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
});
