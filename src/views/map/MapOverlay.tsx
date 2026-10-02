import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, EmptyState, IconButton, SegmentedControl, type SegmentOption } from '@/components';
import { borderRadius, colors, layout, shadows, spacing } from '@/theme';
import type { TimeRange } from '@/utils/days';
import type { MapViewModel } from '@/viewmodels/useMapViewModel';
import { FLOATING_GAP, LOCATE_ICON_SIZE, SEGMENT_TOP_GAP, sheetHeightFor } from './mapConstants';
import { MapSheet } from './MapSheet';

const RANGE_OPTIONS: readonly SegmentOption<TimeRange>[] = [
  { value: 'today', label: 'Hôm nay' },
  { value: 'week', label: 'Tuần này' },
  { value: 'all', label: 'Tất cả' },
];

export interface MapOverlayProps {
  vm: MapViewModel;
}

/** Range switch, locate button, notice, bottom sheet and empty state over the map (native and web). */
export function MapOverlay({ vm }: MapOverlayProps) {
  const insets = useSafeAreaInsets();
  const sheetHeight = useSharedValue(sheetHeightFor(vm.sheetExpanded, insets.bottom));
  const floatingStyle = useAnimatedStyle(() => ({ bottom: sheetHeight.get() + FLOATING_GAP }));

  if (vm.isEmpty) {
    return (
      <View style={[styles.empty, { paddingTop: insets.top }]}>
        <EmptyState
          title="Chưa có nơi nào."
          message="Mỗi nơi bạn chụp ảnh sẽ hiện ở đây."
          icon="location-outline"
          actionLabel="Chụp ảnh"
          onAction={vm.onTakePhoto}
        />
      </View>
    );
  }

  return (
    <>
      <View style={[styles.top, { top: insets.top + SEGMENT_TOP_GAP }]} pointerEvents="box-none">
        <SegmentedControl
          options={RANGE_OPTIONS}
          value={vm.range}
          onChange={vm.onRangeChange}
          accessibilityLabel="Khoảng thời gian"
          appearance="floating"
        />
      </View>

      <Animated.View style={[styles.floating, floatingStyle]} pointerEvents="box-none">
        <IconButton
          icon={vm.isLocating ? 'hourglass-outline' : 'locate'}
          iconSize={LOCATE_ICON_SIZE}
          accessibilityLabel="Hiện vị trí của tôi"
          onPress={vm.onLocatePress}
          disabled={vm.isLocating}
          style={shadows.float}
        />
        {vm.notice ? (
          <View style={[styles.notice, shadows.float]} accessibilityRole="alert" accessibilityLiveRegion="polite">
            <AppText variant="caption">{vm.notice}</AppText>
          </View>
        ) : null}
      </Animated.View>

      <MapSheet vm={vm} height={sheetHeight} insetBottom={insets.bottom} />
    </>
  );
}

const styles = StyleSheet.create({
  top: {
    position: 'absolute',
    left: spacing.lg,
    right: spacing.lg,
  },
  floating: {
    position: 'absolute',
    left: spacing.lg,
    // Keep clear of the "NHẬT KÝ" edge tab drawn on the right edge.
    right: layout.edgeTabTouchWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  notice: {
    flexShrink: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.frameWhite,
    borderRadius: borderRadius.md,
  },
  empty: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.paper,
  },
});
