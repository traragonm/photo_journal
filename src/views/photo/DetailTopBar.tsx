import { StyleSheet, View } from 'react-native';
import { AppText, IconButton } from '@/components';
import { colors, spacing } from '@/theme';

export interface DetailTopBarProps {
  title: string;
  /** 0-based index of this photo among the day's photos. */
  index: number;
  count: number;
  flipped: boolean;
  onBack: () => void;
  onFlip: () => void;
}

const DOT = 6;
const DOT_GAP = 5;

/** Back chevron, date with day-position dots, and the flip button. */
export function DetailTopBar({ title, index, count, flipped, onBack, onFlip }: DetailTopBarProps) {
  return (
    <View style={styles.bar}>
      <IconButton icon="chevron-back" tone="plain" accessibilityLabel="Quay lại" onPress={onBack} />
      <View style={styles.center}>
        <AppText variant="label">{title}</AppText>
        {count > 0 ? (
          <View style={styles.dots} accessible accessibilityLabel={`Ảnh ${index + 1} trên ${count} của ngày`}>
            {Array.from({ length: count }, (_, i) => (
              <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
            ))}
          </View>
        ) : null}
      </View>
      <IconButton
        icon="sync-outline"
        tone="plain"
        accessibilityLabel="Lật mặt sau ảnh"
        onPress={onFlip}
        style={flipped ? styles.flipped : undefined}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    alignSelf: 'stretch',
    paddingHorizontal: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: { alignItems: 'center' },
  dots: { flexDirection: 'row', gap: DOT_GAP, marginTop: spacing.xs, flexWrap: 'wrap', justifyContent: 'center' },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2, backgroundColor: colors.hairline },
  dotActive: { backgroundColor: colors.ink },
  flipped: { opacity: 0.6 },
});
