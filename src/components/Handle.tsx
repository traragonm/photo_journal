import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, layout, spacing } from '@/theme';
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
  /** Icon / label colour (default muted ink). */
  tint?: string;
  style?: StyleProp<ViewStyle>;
}

const ICON_SIZE = 18;

/** Grab bar + hint, used at sheet edges. Tappable as an alternative to dragging. */
export function Handle({
  label,
  icon,
  barPosition = 'top',
  onPress,
  accessibilityLabel,
  tint = colors.muted,
  style,
}: HandleProps) {
  const bar = <View style={styles.bar} />;

  // Show text only when label is provided (backward compat)
  const text = label ? (
    <View style={styles.labelRow}>
      {icon ? <Ionicons name={icon} size={ICON_SIZE} color={tint} /> : null}
      <AppText variant="caption" style={{ color: tint }}>
        {label}
      </AppText>
    </View>
  ) : null;

  // Show icon-only when label is not provided but icon is
  const iconOnly = !label && icon ? (
    <Ionicons name={icon} size={ICON_SIZE} color={tint} />
  ) : null;

  const content = (
    <>
      {barPosition === 'top' ? bar : null}
      {text || iconOnly}
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
