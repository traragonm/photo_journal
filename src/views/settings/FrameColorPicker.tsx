import { StyleSheet, View } from 'react-native';
import type { FrameColor } from '@/models';
import { PressableScale } from '@/components';
import { borderRadius, borderWidth, colors, frameColors, layout } from '@/theme';
import { rowColors, SWATCH_GAP, SWATCH_OUTER, SWATCH_RING, SWATCH_SIZE, SWATCH_SPACING } from './settingsConstants';

const ORDER: readonly FrameColor[] = ['white', 'cream', 'black'];

interface FrameColorPickerProps {
  value: FrameColor;
  onChange: (value: FrameColor) => void;
}

/** Three round print-border swatches; the selected one gets an ink ring like the artboard. */
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
            <View style={[styles.ring, selected && styles.ringSelected]}>
              <View
                style={[
                  styles.swatch,
                  { backgroundColor: fill },
                  key !== 'black' && styles.swatchBorder,
                ]}
              />
            </View>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: SWATCH_SPACING },
  touch: {
    width: layout.minTouch,
    height: layout.minTouch,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    width: SWATCH_OUTER,
    height: SWATCH_OUTER,
    borderRadius: borderRadius.pill,
    borderWidth: SWATCH_RING,
    borderColor: colors.transparent,
    padding: SWATCH_GAP,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ringSelected: { borderColor: rowColors.swatchRing, backgroundColor: rowColors.swatchGap },
  swatch: { width: SWATCH_SIZE, height: SWATCH_SIZE, borderRadius: borderRadius.pill },
  swatchBorder: { borderWidth: borderWidth.hairline, borderColor: rowColors.swatchBorder },
});
