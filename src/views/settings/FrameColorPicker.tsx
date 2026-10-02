import { StyleSheet, View } from 'react-native';
import type { FrameColor } from '@/models';
import { PressableScale } from '@/components';
import { borderRadius, colors, frameColors } from '@/theme';
import {
  CAP_PRESSED_SCALE,
  CAP_SIZE,
  DOT_GAP,
  DOT_SIZE,
  RING_PADDING,
  RING_SIZE,
  SWATCH_HEIGHT,
  SWATCH_SPACING,
  SWATCH_WIDTH,
  rowColors,
} from './settingsConstants';

const ORDER: readonly FrameColor[] = ['white', 'cream', 'black'];

interface FrameColorPickerProps {
  value: FrameColor;
  onChange: (value: FrameColor) => void;
}

/** Three print-border caps in knurled rings; the selected cap is pressed in, with an accent dot below. */
export function FrameColorPicker({ value, onChange }: FrameColorPickerProps) {
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="Màu viền ảnh" style={styles.row}>
      {ORDER.map((key) => {
        const selected = key === value;
        const { label, fill } = frameColors[key];
        return (
          <PressableScale
            key={key}
            onPress={() => onChange(key)}
            accessibilityRole="radio"
            accessibilityLabel={selected ? `${label} (đang chọn)` : label}
            accessibilityState={{ checked: selected }}
            style={styles.touch}
          >
            <View style={styles.ring}>
              <View
                style={[
                  styles.cap,
                  { backgroundColor: fill },
                  selected ? styles.capPressed : styles.capRaised,
                ]}
              />
            </View>
            <View style={[styles.dot, selected && styles.dotSelected]} />
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SWATCH_SPACING },
  touch: {
    width: SWATCH_WIDTH,
    height: SWATCH_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: DOT_GAP,
  },
  // RN has no conic gradients: the knurl is approximated by a two-tone ring (light fill, dark rim).
  ring: {
    width: RING_SIZE,
    height: RING_SIZE,
    borderRadius: borderRadius.pill,
    padding: RING_PADDING,
    backgroundColor: colors.knurlRingLight,
    borderWidth: 1,
    borderColor: colors.knurlRingDark,
    boxShadow: `0 2px 3px ${colors.ringShadow}`,
  },
  cap: { width: CAP_SIZE, height: CAP_SIZE, borderRadius: borderRadius.pill },
  capRaised: {
    boxShadow: `inset 0 -2px 3px ${colors.cameraSwitchThumbShadowLight}, 0 1px 2px ${colors.capShadowRaised}`,
  },
  capPressed: {
    transform: [{ scale: CAP_PRESSED_SCALE }],
    boxShadow: `inset 0 2px 4px ${colors.capShadowPressed}`,
  },
  dot: { width: DOT_SIZE, height: DOT_SIZE, borderRadius: borderRadius.pill, backgroundColor: colors.transparent },
  dotSelected: { backgroundColor: rowColors.selectedDot },
});
