import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, EmptyState, Handle, PressableScale } from '@/components';
import { borderRadius, colors, layout, shadows, spacing } from '@/theme';
import { useDiaryViewModel } from '@/viewmodels/useDiaryViewModel';
import { SheetPullZone } from '@/views/home/SheetPullZone';
import { CaptionModal } from './CaptionModal';
import { PrintPile } from './PrintPile';
import { WeekStrip } from './WeekStrip';

const HEADER_GUTTER = 28;
const HINT_TEXT = 'Chạm để xem ảnh · Giữ để viết ghi chú';
const BOTTOM_EXTRA = spacing.xs;

/** Main "Hôm nay" pane: a day's prints scattered on the table, the week strip and the sheet handles. */
export function DiaryScreen() {
  const vm = useDiaryViewModel();
  const insets = useSafeAreaInsets();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const hasPhotos = vm.photos.length > 0;

  const onAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <SheetPullZone sheet="settings" intent="open" style={styles.topZone}>
        <Handle label="Cài đặt" icon="settings-outline" onPress={vm.openSettings} accessibilityLabel="Mở cài đặt" />
      </SheetPullZone>

      <View style={styles.header}>
        <View style={styles.headerText}>
          <AppText variant="eyebrow" color="textMuted">
            {vm.eyebrow}
          </AppText>
          <AppText variant="display" accessibilityRole="header" numberOfLines={1} adjustsFontSizeToFit>
            {vm.title}
          </AppText>
        </View>
        <AppText variant="handLarge" color="textMuted" style={styles.count}>
          {vm.countLabel}
        </AppText>
      </View>

      <View style={styles.pileArea} onLayout={onAreaLayout}>
        {vm.isLoaded && !hasPhotos ? (
          <View style={styles.empty}>
            <EmptyState
              title={vm.emptyTitle}
              message="Vuốt sang trái hoặc chạm CHỤP để ghi lại khoảnh khắc."
              actionLabel={vm.isToday ? 'Chụp ảnh' : undefined}
              onAction={vm.isToday ? vm.goToCamera : undefined}
            />
          </View>
        ) : null}
        {hasPhotos && area.width > 0 ? (
          <PrintPile
            // A new day starts a fresh pile (and replays the entrance).
            key={`${vm.eyebrow}-${vm.isExpanded ? 'column' : 'pile'}`}
            photos={vm.isExpanded ? vm.photos : vm.pilePhotos}
            width={area.width}
            height={area.height}
            expanded={vm.isExpanded}
            onPressPhoto={vm.openPhoto}
            onLongPressPhoto={vm.caption.start}
          />
        ) : null}
        {vm.hiddenCount > 0 ? (
          <View style={styles.chipRow} pointerEvents="box-none">
          <PressableScale
            onPress={vm.toggleExpanded}
            hitSlop={layout.hitSlop}
            accessibilityRole="button"
            accessibilityLabel={vm.isExpanded ? 'Thu gọn các tấm ảnh' : `Xem thêm ${vm.hiddenCount} tấm ảnh`}
            style={styles.chip}
          >
            <AppText variant="hand">{vm.isExpanded ? 'Thu gọn' : `+${vm.hiddenCount} tấm nữa`}</AppText>
          </PressableScale>
          </View>
        ) : null}
      </View>

      {hasPhotos ? (
        <AppText variant="caption" color="textMuted" align="center" style={styles.hint}>
          {HINT_TEXT}
        </AppText>
      ) : null}

      <View style={styles.strip}>
        <WeekStrip
          week={vm.week}
          canGoNext={vm.canGoNextWeek}
          onSelect={vm.selectDay}
          onPreviousWeek={vm.goPreviousWeek}
          onNextWeek={vm.goNextWeek}
        />
      </View>

      <SheetPullZone sheet="calendar" intent="open" style={styles.bottomZone}>
        <Handle
          label="Kéo lên · Lịch ảnh"
          icon="calendar-outline"
          barPosition="bottom"
          onPress={vm.openCalendar}
          accessibilityLabel="Mở lịch ảnh"
        />
      </SheetPullZone>

      <CaptionModal editor={vm.caption} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.paper,
  },
  topZone: {
    alignSelf: 'stretch',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: spacing.md,
    paddingHorizontal: HEADER_GUTTER,
    paddingTop: spacing.xs,
  },
  headerText: {
    flexShrink: 1,
  },
  count: {
    paddingBottom: spacing.xs,
  },
  pileArea: {
    flex: 1,
    marginTop: spacing.xs,
  },
  empty: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: spacing.xs,
    alignItems: 'center',
    zIndex: 100,
  },
  chip: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
    minHeight: spacing.xxxl - spacing.sm,
    justifyContent: 'center',
    borderRadius: borderRadius.pill,
    backgroundColor: colors.chip,
    ...shadows.soft,
  },
  hint: {
    paddingVertical: spacing.xs,
  },
  strip: {
    paddingHorizontal: spacing.sm,
    paddingBottom: BOTTOM_EXTRA,
  },
  bottomZone: {
    alignSelf: 'stretch',
  },
});
