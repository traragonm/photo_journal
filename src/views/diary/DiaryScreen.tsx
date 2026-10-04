import { useState } from 'react';
import { StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, EmptyState, Handle, PressableScale } from '@/components';
import { borderRadius, colors, layout, shadows, spacing } from '@/theme';
import { useWeatherLook } from '@/viewmodels/useAmbient';
import { useDiaryViewModel } from '@/viewmodels/useDiaryViewModel';
import { useHomeNav } from '@/views/home/HomeNavigator';
import { SheetPullZone } from '@/views/home/SheetPullZone';
import { MoodButton } from '@/views/weather/MoodButton';
import { WeatherEffects } from '@/views/weather/WeatherEffects';
import { CaptionModal } from './CaptionModal';
import { PrintPile } from './PrintPile';
import { WeatherChip } from './WeatherChip';
import { WeekStrip } from './WeekStrip';

const HEADER_GUTTER = 28;
const HINT_TEXT = 'Chạm để xem ảnh · Giữ để viết ghi chú';
const LIBRARY_ICON_SIZE = 20;
const BOTTOM_EXTRA = spacing.xs;
/** Floating mood button (design: right 18, bottom 128 — above the week strip). */
const MOOD_RIGHT = 18;
const MOOD_BOTTOM = 128;

/** Main "Hôm nay" pane: a day's prints scattered on the table, the week strip and the sheet handles. */
export function DiaryScreen() {
  const vm = useDiaryViewModel();
  const insets = useSafeAreaInsets();
  const [area, setArea] = useState({ width: 0, height: 0 });
  const [page, setPage] = useState({ width: 0, height: 0 });
  const look = useWeatherLook();
  const palette = look.diary;
  const isShowing = useHomeNav().isPaneActive('diary');
  const hasPhotos = vm.photos.length > 0;

  const onAreaLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setArea((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  const onPageLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setPage((current) => (current.width === width && current.height === height ? current : { width, height }));
  };

  return (
    <View
      style={[styles.root, { paddingTop: insets.top, paddingBottom: insets.bottom, backgroundColor: palette.page }]}
      onLayout={onPageLayout}
    >
      <WeatherEffects
        sky={look.effectsSky}
        layer="back"
        width={page.width}
        height={page.height}
        active={isShowing}
        dark={palette.dark}
      />
      <SheetPullZone sheet="settings" intent="open" style={styles.topZone}>
        <Handle icon="settings-outline" onPress={vm.openSettings} accessibilityLabel="Mở cài đặt" tint={palette.muted} />
      </SheetPullZone>

      <View style={styles.header}>
        <View style={styles.headerText}>
          <View style={styles.eyebrowRow}>
            <AppText variant="eyebrow" style={{ color: palette.muted }}>
              {vm.eyebrow}
            </AppText>
            <WeatherChip palette={palette} />
          </View>
          <AppText
            variant="display"
            accessibilityRole="header"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ color: palette.ink }}
          >
            {vm.title}
          </AppText>
        </View>
        <PressableScale
          onPress={vm.openLibrary}
          hitSlop={layout.hitSlop}
          accessibilityRole="button"
          accessibilityLabel="Mở thư viện ảnh"
          style={styles.libraryPill}
        >
          <AppText variant="handLarge" style={{ color: palette.muted }}>
            {vm.countLabel}
          </AppText>
          <Ionicons name="grid-outline" size={LIBRARY_ICON_SIZE} color={palette.muted} />
        </PressableScale>
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
        <AppText variant="caption" align="center" style={[styles.hint, { color: palette.muted }]}>
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
          palette={palette}
        />
      </View>

      <SheetPullZone sheet="calendar" intent="open" style={styles.bottomZone}>
        <Handle
          icon="calendar-outline"
          barPosition="bottom"
          onPress={vm.openCalendar}
          accessibilityLabel="Mở lịch ảnh"
          tint={palette.muted}
        />
      </SheetPullZone>

      <WeatherEffects
        sky={look.effectsSky}
        layer="front"
        width={page.width}
        height={page.height}
        active={isShowing}
        dark={palette.dark}
      />
      <MoodButton style={{ right: MOOD_RIGHT, bottom: insets.bottom + MOOD_BOTTOM }} />

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
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  libraryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    height: layout.minTouch,
    paddingHorizontal: spacing.md,
    marginRight: -spacing.md,
    borderRadius: borderRadius.pill,
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
