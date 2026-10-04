import { StyleSheet, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppText, PressableScale } from '@/components';
import { borderRadius, borderWidth, colors, diaryPalettes, layout, spacing, type DiaryPalette } from '@/theme';
import type { DayKey } from '@/utils/date';
import type { WeekDay } from '@/utils/days';

export interface WeekStripProps {
  week: readonly WeekDay[];
  canGoNext: boolean;
  onSelect: (day: DayKey) => void;
  onPreviousWeek: () => void;
  onNextWeek: () => void;
  /** Page colours (the diary follows the weather theme). */
  palette?: DiaryPalette;
}

const CHEVRON_WIDTH = 26;
const CHEVRON_SIZE = 18;
const DOT_SIZE = 5;
const DISABLED_OPACITY = 0.35;

function dayLabel(day: WeekDay): string {
  const parts = [`${day.weekday} ngày ${day.dayOfMonth}`];
  if (day.hasPhotos) parts.push('có ảnh');
  if (day.isToday) parts.push('hôm nay');
  return parts.join(', ');
}

/**
 * Monday-first week of day buttons. Weeks are paged with the side chevrons (not a swipe),
 * so horizontal drags on the strip still belong to the pane swipe.
 */
export function WeekStrip({
  week,
  canGoNext,
  onSelect,
  onPreviousWeek,
  onNextWeek,
  palette = diaryPalettes.paper,
}: WeekStripProps) {
  return (
    <View style={styles.row}>
      <PressableScale
        onPress={onPreviousWeek}
        hitSlop={layout.hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Tuần trước"
        style={styles.chevron}
      >
        <Ionicons name="chevron-back" size={CHEVRON_SIZE} color={palette.muted} />
      </PressableScale>
      <View style={styles.days}>
        {week.map((day) => {
          const textColor = day.isSelected ? palette.todayFg : day.isFuture ? palette.future : palette.day;
          const dotColor = !day.hasPhotos ? colors.transparent : day.isSelected ? palette.todayFg : colors.accent;
          return (
            <PressableScale
              key={day.key}
              onPress={() => onSelect(day.key)}
              disabled={day.isFuture}
              accessibilityRole="button"
              accessibilityLabel={dayLabel(day)}
              accessibilityState={{ selected: day.isSelected, disabled: day.isFuture }}
              style={[
                styles.day,
                day.isSelected && { backgroundColor: palette.todayBg },
                day.isToday && !day.isSelected && styles.dayToday,
              ]}
            >
              <AppText variant="caption" style={{ color: textColor }}>
                {day.weekday}
              </AppText>
              <AppText variant="cardTitle" style={[styles.dayNumber, { color: textColor }]}>
                {day.dayOfMonth}
              </AppText>
              <View style={[styles.dot, { backgroundColor: dotColor }]} />
            </PressableScale>
          );
        })}
      </View>
      <PressableScale
        onPress={onNextWeek}
        disabled={!canGoNext}
        hitSlop={layout.hitSlop}
        accessibilityRole="button"
        accessibilityLabel="Tuần sau"
        accessibilityState={{ disabled: !canGoNext }}
        style={[styles.chevron, !canGoNext && styles.chevronDisabled]}
      >
        <Ionicons name="chevron-forward" size={CHEVRON_SIZE} color={palette.muted} />
      </PressableScale>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  chevron: {
    width: CHEVRON_WIDTH,
    height: layout.dayButtonHeight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevronDisabled: {
    opacity: DISABLED_OPACITY,
  },
  days: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  day: {
    flex: 1,
    maxWidth: layout.dayButtonWidth,
    height: layout.dayButtonHeight,
    borderRadius: borderRadius.lg,
    borderWidth: borderWidth.hairline,
    borderColor: colors.transparent,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  dayToday: {
    borderColor: colors.handle,
  },
  dayNumber: {
    fontSize: 17,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: borderRadius.pill,
  },
});
