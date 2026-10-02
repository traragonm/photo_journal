import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { borderRadius, colors, layout, shadows, spacing } from '@/theme';
import { AppText } from './AppText';
import { PressableScale } from './PressableScale';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  options: readonly SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** 'floating' = white pill with shadow (map), 'inset' = chip background (settings rows). */
  appearance?: 'floating' | 'inset';
  size?: 'regular' | 'compact';
  style?: StyleProp<ViewStyle>;
}

const REGULAR_HEIGHT = 36;
const COMPACT_HEIGHT = 30;
const REGULAR_MIN_WIDTH = 84;

/** Pill segmented control ("Hôm nay · Tuần này · Tất cả", "Mini · Square · Wide"). */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
  appearance = 'floating',
  size = 'regular',
  style,
}: SegmentedControlProps<T>) {
  const compact = size === 'compact';
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[
        styles.group,
        appearance === 'floating' ? [styles.floating, shadows.float] : styles.inset,
        compact && styles.groupCompact,
        style,
      ]}
    >
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <PressableScale
            key={option.value}
            onPress={() => onChange(option.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: selected }}
            accessibilityLabel={option.label}
            hitSlop={compact ? layout.hitSlop : undefined}
            style={[
              styles.segment,
              compact ? styles.segmentCompact : styles.segmentRegular,
              selected && styles.selected,
            ]}
          >
            <AppText
              variant={compact ? 'caption' : 'label'}
              style={{ color: selected ? colors.onInk : colors.inkSoft }}
            >
              {option.label}
            </AppText>
          </PressableScale>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: borderRadius.pill,
    alignSelf: 'center',
  },
  groupCompact: {
    gap: spacing.xxs,
    padding: 3,
  },
  floating: { backgroundColor: colors.frameWhite },
  inset: { backgroundColor: colors.chip },
  segment: {
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentRegular: {
    height: REGULAR_HEIGHT,
    minWidth: REGULAR_MIN_WIDTH,
    paddingHorizontal: spacing.md,
  },
  segmentCompact: {
    height: COMPACT_HEIGHT,
    paddingHorizontal: spacing.md,
  },
  selected: { backgroundColor: colors.ink },
});
