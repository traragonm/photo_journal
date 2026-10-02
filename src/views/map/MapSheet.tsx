import { useEffect } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring, type SharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText, PhotoThumbnail, PressableScale } from '@/components';
import { borderRadius, colors, layout, shadows, spacing, springs } from '@/theme';
import { useFrameStyle } from '@/viewmodels/shared';
import type { MapViewModel, PlaceRow } from '@/viewmodels/useMapViewModel';
import {
  SHEET_DRAG_ACTIVATE_OFFSET,
  SHEET_FLICK_VELOCITY,
  SHEET_GAP,
  SHEET_PADDING_BOTTOM,
  SHEET_PADDING_H,
  SHEET_PADDING_TOP,
  SHEET_RADIUS,
  SHEET_ROW_GAP,
  SHEET_ROW_HEIGHT,
  SHEET_THUMB_WIDTH,
  sheetHeightFor,
} from './mapConstants';

export interface MapSheetProps {
  vm: MapViewModel;
  /** Animated sheet height, shared with the floating controls above it. */
  height: SharedValue<number>;
  insetBottom: number;
}

/** Bottom sheet listing the places of the current range; drag the bar to peek / expand. */
export function MapSheet({ vm, height, insetBottom }: MapSheetProps) {
  const { setSheetExpanded, sheetExpanded } = vm;
  const minHeight = sheetHeightFor(false, insetBottom);
  const maxHeight = sheetHeightFor(true, insetBottom);

  // State → height (taps on the bar, programmatic changes).
  useEffect(() => {
    height.set(withSpring(sheetExpanded ? maxHeight : minHeight, springs.gentle));
  }, [sheetExpanded, minHeight, maxHeight, height]);

  const dragStart = useSharedValue(0);
  const pan = Gesture.Pan()
    .activeOffsetY([-SHEET_DRAG_ACTIVATE_OFFSET, SHEET_DRAG_ACTIVATE_OFFSET])
    .onStart(() => {
      dragStart.set(height.get());
    })
    .onUpdate((event) => {
      height.set(Math.min(maxHeight, Math.max(minHeight, dragStart.get() - event.translationY)));
    })
    .onEnd((event) => {
      let expand = height.get() > (minHeight + maxHeight) / 2;
      if (event.velocityY < -SHEET_FLICK_VELOCITY) expand = true;
      if (event.velocityY > SHEET_FLICK_VELOCITY) expand = false;
      height.set(withSpring(expand ? maxHeight : minHeight, springs.gentle));
      scheduleOnRN(setSheetExpanded, expand);
    });

  const sheetStyle = useAnimatedStyle(() => ({ height: height.get() }));

  return (
    <Animated.View
      style={[
        styles.sheet,
        shadows.sheet,
        { paddingBottom: Math.max(insetBottom, SHEET_PADDING_BOTTOM) },
        sheetStyle,
      ]}
    >
      <GestureDetector gesture={pan}>
        <View collapsable={false} style={styles.header}>
          <PressableScale
            onPress={() => setSheetExpanded(!sheetExpanded)}
            accessibilityRole="button"
            accessibilityLabel={sheetExpanded ? 'Thu gọn danh sách nơi đã đến' : 'Mở rộng danh sách nơi đã đến'}
            hitSlop={layout.hitSlop}
            style={styles.grabZone}
          >
            <View style={styles.grabBar} />
          </PressableScale>
          <View style={styles.titleRow}>
            <AppText variant="subheading" accessibilityRole="header">
              {vm.sheetTitle}
            </AppText>
            <AppText variant="label" color="textMuted">
              {vm.sheetCount}
            </AppText>
          </View>
        </View>
      </GestureDetector>

      {vm.sheetEmptyMessage ? (
        <AppText variant="body" color="textMuted" style={styles.emptyText}>
          {vm.sheetEmptyMessage}
        </AppText>
      ) : (
        <ScrollView
          style={styles.list}
          showsVerticalScrollIndicator={false}
          accessibilityLabel="Danh sách nơi đã đến"
        >
          {vm.rows.map((row) => (
            <SheetRow key={row.photo.id} row={row} onPress={vm.onRowPress} />
          ))}
        </ScrollView>
      )}
    </Animated.View>
  );
}

function SheetRow({ row, onPress }: { row: PlaceRow; onPress: (id: string) => void }) {
  const { captionVariant } = useFrameStyle();
  return (
    <PressableScale
      onPress={() => onPress(row.photo.id)}
      accessibilityRole="button"
      accessibilityLabel={`${row.title}, ${row.subtitle}`}
      accessibilityHint={row.selected ? 'Chạm để mở ảnh' : 'Chạm để xem trên bản đồ'}
      accessibilityState={{ selected: row.selected }}
      pressedScale={0.98}
      style={[styles.row, row.selected && styles.rowSelected]}
    >
      <PhotoThumbnail photo={row.photo} width={SHEET_THUMB_WIDTH} accessibilityLabel={row.title} />
      <View style={styles.rowText}>
        <AppText variant={row.hasCaption ? captionVariant : 'bodyMedium'} numberOfLines={1}>
          {row.title}
        </AppText>
        <AppText variant="caption" color="textMuted" numberOfLines={1}>
          {row.subtitle}
        </AppText>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingTop: SHEET_PADDING_TOP,
    paddingHorizontal: SHEET_PADDING_H,
    gap: SHEET_GAP,
    backgroundColor: colors.frameWhite,
    borderTopLeftRadius: SHEET_RADIUS,
    borderTopRightRadius: SHEET_RADIUS,
    overflow: 'hidden',
  },
  header: {
    gap: SHEET_GAP,
  },
  grabZone: {
    alignSelf: 'center',
    width: layout.minTouch,
    height: layout.handleHeight + spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabBar: {
    width: layout.handleWidth,
    height: layout.handleHeight,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.hairline,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  list: {
    flex: 1,
  },
  emptyText: {
    paddingTop: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SHEET_ROW_GAP,
    height: SHEET_ROW_HEIGHT,
    marginHorizontal: -spacing.sm,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.lg,
  },
  rowSelected: {
    backgroundColor: colors.chip,
  },
  rowText: {
    flex: 1,
  },
});
