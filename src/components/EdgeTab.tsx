import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, layout, spacing } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export interface EdgeTabProps {
  /** Which screen edge the tab hugs. */
  side: 'left' | 'right';
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  accessibilityLabel: string;
  /** Tab colours: dark ink (default), accent (camera), or light (on the dark camera body). */
  tone?: 'ink' | 'accent' | 'light';
  /** Distance from the top of the screen to the tab's touch area. */
  top: number;
}

const ICON_SIZE = 15;
/** Length of the rotated label box (it is laid out horizontally, then turned 90°). */
const LABEL_LENGTH = 64;
const LABEL_THICKNESS = 14;
const TONES = {
  ink: { bg: colors.ink, fg: colors.onInk },
  accent: { bg: colors.accent, fg: colors.white },
  light: { bg: colors.onInk, fg: colors.cameraBody },
} as const;

/**
 * Vertical pull-tab on the screen edge ("BẢN ĐỒ", "CHỤP", "NHẬT KÝ").
 * Tapping it does the same as swiping toward that side.
 */
export function EdgeTab({ side, label, icon, onPress, accessibilityLabel, tone = 'ink', top }: EdgeTabProps) {
  const { bg, fg } = TONES[tone];
  const isLeft = side === 'left';
  return (
    <PressableScale
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={[styles.touch, { top }, isLeft ? styles.touchLeft : styles.touchRight]}
    >
      <View style={[styles.tab, { backgroundColor: bg }, isLeft ? styles.tabLeft : styles.tabRight]}>
        <Ionicons name={icon} size={ICON_SIZE} color={fg} />
        <View style={styles.labelSlot}>
          <AppText
            variant="tab"
            style={[styles.label, { color: fg, transform: [{ rotate: isLeft ? '-90deg' : '90deg' }] }]}
          >
            {label}
          </AppText>
        </View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  touch: {
    position: 'absolute',
    width: layout.edgeTabTouchWidth,
    height: layout.edgeTabTouchHeight,
    justifyContent: 'center',
    zIndex: 5,
  },
  touchLeft: { left: 0, alignItems: 'flex-start' },
  touchRight: { right: 0, alignItems: 'flex-end' },
  tab: {
    width: layout.edgeTabWidth,
    height: layout.edgeTabHeight,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  tabLeft: { borderTopRightRadius: borderRadius.lg, borderBottomRightRadius: borderRadius.lg },
  tabRight: { borderTopLeftRadius: borderRadius.lg, borderBottomLeftRadius: borderRadius.lg },
  labelSlot: {
    width: LABEL_THICKNESS,
    height: LABEL_LENGTH - ICON_SIZE,
    justifyContent: 'center',
  },
  // Laid out horizontally at full length (absolutely, so the narrow slot can't clip or
  // ellipsize it), then rotated 90° around its centre.
  label: {
    position: 'absolute',
    width: LABEL_LENGTH,
    left: (LABEL_THICKNESS - LABEL_LENGTH) / 2,
    textAlign: 'center',
  },
});
