import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, EmptyState, IconButton } from '@/components';
import { borderRadius, colors, layout, shadows, spacing } from '@/theme';
import type { MapViewModel } from '@/viewmodels/useMapViewModel';
import { FLOATING_GAP, LOCATE_ICON_SIZE } from './mapConstants';

export interface MapOverlayProps {
  vm: MapViewModel;
}

/** Locate button, notice and empty state over the map (native and web). */
export function MapOverlay({ vm }: MapOverlayProps) {
  const insets = useSafeAreaInsets();

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
      <View style={[styles.floating, { bottom: insets.bottom + FLOATING_GAP }]} pointerEvents="box-none">
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
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  floating: {
    position: 'absolute',
    left: spacing.lg,
    // Keep clear of the diary edge tab drawn on the right edge.
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
