import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, PressableScale, Toggle } from '@/components';
import { colors, pressFeedback, spacing } from '@/theme';
import { CHEVRON_SIZE, ROW_GAP, ROW_HEIGHT } from './settingsConstants';

interface ToggleRowProps {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  /** Muted explanation under the row. */
  note?: string;
  children?: ReactNode;
}

/** Label on the left, design Toggle on the right (+ optional note / extra content below). */
export function ToggleRow({ label, value, onValueChange, disabled = false, note, children }: ToggleRowProps) {
  return (
    <View>
      <View style={styles.row}>
        <AppText variant="body" style={styles.label}>
          {label}
        </AppText>
        <Toggle value={value} onValueChange={onValueChange} accessibilityLabel={label} disabled={disabled} />
      </View>
      {note ? (
        <AppText variant="caption" color="textMuted" style={styles.note}>
          {note}
        </AppText>
      ) : null}
      {children}
    </View>
  );
}

interface NavRowProps {
  label: string;
  onPress: () => void;
  /** Right-side value ("20:00", "Tắt", "Đang sao chép 3/12"). */
  value?: string;
  disabled?: boolean;
  accessibilityHint?: string;
}

/** Tappable row with a trailing chevron. */
export function NavRow({ label, onPress, value, disabled = false, accessibilityHint }: NavRowProps) {
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      pressedScale={pressFeedback.rowScale}
      accessibilityRole="button"
      accessibilityLabel={value ? `${label}, ${value}` : label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled }}
      style={[styles.row, disabled && styles.disabled]}
    >
      <AppText variant="body" style={styles.label}>
        {label}
      </AppText>
      <View style={styles.trailing}>
        {value ? (
          <AppText variant="bodyMedium" color="textMuted" numberOfLines={1} style={styles.value}>
            {value}
          </AppText>
        ) : null}
        <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={colors.muted} />
      </View>
    </PressableScale>
  );
}

const DISABLED_OPACITY = 0.5;
/** Trailing values are one step smaller than labels in the artboard (14 vs 15). */
const VALUE_FONT_SIZE = 14;

const styles = StyleSheet.create({
  row: {
    minHeight: ROW_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: ROW_GAP,
  },
  label: { flexShrink: 1 },
  trailing: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, flexShrink: 1 },
  value: { fontSize: VALUE_FONT_SIZE },
  note: { paddingBottom: spacing.md },
  disabled: { opacity: DISABLED_OPACITY },
});
