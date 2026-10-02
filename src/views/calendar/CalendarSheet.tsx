import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, IconButton, PolaroidCard, PressableScale } from '@/components';
import { borderRadius, colors, layout, spacing } from '@/theme';
import { useCalendarViewModel } from '@/viewmodels/useCalendarViewModel';
import { CalendarDayCell } from './CalendarDayCell';
import { BODY_GUTTER, CARD_PRINT_WIDTH, CARD_TILTS, CELL_GAP } from './calendarConstants';
import { formatClock } from '@/utils/date';

/** Body of the calendar sheet (HomeScreen draws the container and the close handle). */
export function CalendarSheet() {
  const vm = useCalendarViewModel();
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      style={styles.fill}
      contentContainerStyle={[styles.content, { paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm }]}
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <View style={styles.monthRow}>
        <IconButton icon="chevron-back" accessibilityLabel="Tháng trước" onPress={vm.goPreviousMonth} />
        <View style={styles.monthTitle}>
          <AppText variant="heading" accessibilityRole="header">
            {vm.title}
          </AppText>
          <AppText variant="caption" color="textMuted">
            {vm.stats}
          </AppText>
        </View>
        <IconButton
          icon="chevron-forward"
          accessibilityLabel="Tháng sau"
          onPress={vm.goNextMonth}
          disabled={!vm.canGoNext}
        />
      </View>

      <View style={styles.weekdays} accessible={false}>
        {vm.weekdayHeaders.map((name) => (
          <AppText key={name} variant="tab" color="textMuted" align="center" style={styles.weekday}>
            {name}
          </AppText>
        ))}
      </View>

      <View style={styles.grid}>
        {vm.rows.map((row) => (
          <View key={row[0].key} style={styles.gridRow}>
            {row.map((cell) => (
              <CalendarDayCell key={cell.key} cell={cell} onPress={vm.selectCell} />
            ))}
          </View>
        ))}
      </View>

      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <AppText variant="cardTitle" accessibilityRole="header" style={styles.cardTitle}>
            {vm.selectedTitle}
          </AppText>
          <PressableScale
            onPress={vm.openDiary}
            hitSlop={layout.hitSlop}
            accessibilityRole="button"
            accessibilityLabel="Mở nhật ký ngày này"
            style={styles.link}
          >
            <AppText variant="label" style={styles.linkText}>
              Mở nhật ký
            </AppText>
          </PressableScale>
        </View>
        {vm.selectedPhotos.length === 0 ? (
          <AppText variant="body" color="textMuted">
            Chưa có ảnh ngày này.
          </AppText>
        ) : (
          <>
            <View style={styles.prints}>
              {vm.selectedPhotos.map((photo, index) => (
                <View key={photo.id} style={styles.printColumn}>
                  <PolaroidCard
                    photo={photo}
                    width={CARD_PRINT_WIDTH}
                    rotation={CARD_TILTS[index % CARD_TILTS.length]}
                    shadow="print"
                    bare
                    onPress={vm.openPhoto}
                  />
                  <AppText variant="handSmall" style={styles.time}>
                    {formatClock(photo.createdAt)}
                  </AppText>
                </View>
              ))}
            </View>
            {vm.selectedExtra > 0 ? (
              <AppText variant="caption" color="textMuted">
                và {vm.selectedExtra} tấm nữa trong nhật ký
              </AppText>
            ) : null}
          </>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: BODY_GUTTER,
  },
  monthRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.sm,
  },
  monthTitle: {
    alignItems: 'center',
    flexShrink: 1,
  },
  weekdays: {
    flexDirection: 'row',
    gap: CELL_GAP,
    marginTop: spacing.lg + spacing.xxs,
  },
  weekday: {
    flex: 1,
  },
  grid: {
    gap: CELL_GAP,
    marginTop: spacing.sm,
  },
  gridRow: {
    flexDirection: 'row',
    gap: CELL_GAP,
  },
  card: {
    marginTop: 'auto',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.lg + spacing.xxs,
    paddingBottom: spacing.lg + spacing.xxs,
    backgroundColor: colors.card,
    borderRadius: borderRadius.cardLarge,
    gap: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cardTitle: {
    flexShrink: 1,
  },
  link: {
    minHeight: layout.minTouch,
    justifyContent: 'center',
  },
  linkText: {
    color: colors.accentText,
  },
  prints: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs + spacing.xxs,
    paddingTop: spacing.xs,
  },
  printColumn: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  time: {
    color: colors.inkSoft,
  },
});
