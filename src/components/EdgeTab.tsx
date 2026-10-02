import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, layout, spacing } from '@/theme';
import { PressableScale } from './PressableScale';

export interface EdgeTabProps {
  /** Which screen edge the tab hugs. */
  side: 'left' | 'right';
  /** An Ionicons glyph, or `polaroid` for the custom print icon (back to the diary). */
  icon: keyof typeof Ionicons.glyphMap | 'polaroid';
  onPress: () => void;
  accessibilityLabel: string;
  /** Tab colours: dark ink (default), accent (camera), or light (on the dark camera body). */
  tone?: 'ink' | 'accent' | 'light';
  /** Distance from the top of the screen to the tab's touch area. */
  top: number;
}

const ICON_SIZE = 18;
const TONES = {
  ink: { bg: colors.ink, fg: colors.onInk },
  accent: { bg: colors.accent, fg: colors.white },
  light: { bg: colors.onInk, fg: colors.cameraBody },
} as const;

/**
 * Icon-only pull-tab on the screen edge.
 * Tapping it does the same as swiping toward that side.
 */
export function EdgeTab({ side, icon, onPress, accessibilityLabel, tone = 'ink', top }: EdgeTabProps) {
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
        {icon === 'polaroid' ? (
          <PolaroidIcon color={fg} />
        ) : (
          <Ionicons name={icon} size={ICON_SIZE} color={fg} />
        )}
      </View>
    </PressableScale>
  );
}

/** Outline print (rect 14×18 with an 8×8 window) drawn at the 18px icon size. */
function PolaroidIcon({ color }: { color: string }) {
  return (
    <View style={styles.iconBox}>
      <View style={[styles.print, { borderColor: color }]}>
        <View style={[styles.window, { borderColor: color }]} />
      </View>
    </View>
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
  iconBox: { width: ICON_SIZE, height: ICON_SIZE, alignItems: 'center', justifyContent: 'center' },
  // 24-unit icon grid scaled to 18px: stroke 2 → 1.5, rect 14×18 → 10.5×13.5, window 8 → 6.
  print: { width: 12, height: 15, borderWidth: 1.5, borderRadius: 1.5, alignItems: 'center', paddingTop: 1.5 },
  window: { width: 7.5, height: 7.5, borderWidth: 1.5 },
});
