import { StyleSheet, View } from 'react-native';
import { AppText, PhotoImage, PressableScale } from '@/components';
import { borderRadius, borderWidth, colors, shadows } from '@/theme';
import { useFrameStyle } from '@/viewmodels/shared';
import type { CalendarCellModel } from '@/viewmodels/useCalendarViewModel';
import { CELL_HEIGHT, MINI_HEIGHT, MINI_WIDTH, OUTSIDE_OPACITY, STACK_TILT } from './calendarConstants';

const RING_OUTSET = borderWidth.regular;
const MINI_SIDE = 3;
const MINI_BOTTOM = 9;

/** Print border of a mini print; the "behind" print uses the chip tone. */
function MiniPrint({ cell }: { cell: CalendarCellModel }) {
  const { frame } = useFrameStyle();
  const photo = cell.coverPhoto;
  if (!photo) return null;
  return (
    <View style={styles.miniBox}>
      {cell.photoCount > 1 ? (
        <View style={[styles.mini, styles.miniBehind, { transform: [{ rotate: `${STACK_TILT}deg` }] }]} />
      ) : null}
      <View
        style={[
          styles.mini,
          shadows.soft,
          { backgroundColor: frame.fill, transform: [{ rotate: `${cell.tilt}deg` }] },
        ]}
      >
        <PhotoImage
          uri={photo.imageUri}
          isAvailable={photo.isImageAvailable}
          filter={photo.filter}
          style={styles.miniImage}
          compact
        />
        {cell.isToday ? <View pointerEvents="none" style={styles.ring} /> : null}
      </View>
    </View>
  );
}

/** One day of the month grid: a mini print (stacked when several) or a plain number. */
export function CalendarDayCell({ cell, onPress }: { cell: CalendarCellModel; onPress: (key: string) => void }) {
  const hasPhotos = cell.photoCount > 0;
  const numberColor = cell.isToday ? colors.accentText : cell.isFuture ? colors.faint : colors.ink;
  return (
    <PressableScale
      onPress={() => onPress(cell.key)}
      disabled={cell.isFuture}
      accessibilityRole="button"
      accessibilityLabel={cell.label}
      accessibilityState={{ selected: cell.isSelected, disabled: cell.isFuture }}
      style={[
        styles.cell,
        cell.isToday && styles.cellToday,
        cell.isSelected && styles.cellSelected,
        cell.isOutside && styles.outside,
      ]}
    >
      {hasPhotos ? (
        <>
          <MiniPrint cell={cell} />
          <AppText variant="label" style={[styles.smallNumber, { color: numberColor }]}>
            {cell.dayOfMonth}
          </AppText>
        </>
      ) : (
        <AppText variant="bodyMedium" style={[styles.plainNumber, { color: numberColor }]}>
          {cell.dayOfMonth}
        </AppText>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  cell: {
    flex: 1,
    height: CELL_HEIGHT,
    borderRadius: borderRadius.md,
    borderWidth: borderWidth.hairline,
    borderColor: colors.transparent,
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 3,
  },
  cellToday: {
    backgroundColor: colors.chipPressed,
  },
  cellSelected: {
    borderColor: colors.inkSoft,
  },
  outside: {
    opacity: OUTSIDE_OPACITY,
  },
  miniBox: {
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    marginTop: 4,
  },
  mini: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    paddingTop: MINI_SIDE,
    paddingHorizontal: MINI_SIDE,
    paddingBottom: MINI_BOTTOM,
    borderRadius: borderRadius.xs,
  },
  miniBehind: {
    backgroundColor: colors.chip,
    padding: 0,
    ...shadows.soft,
  },
  miniImage: {
    flex: 1,
  },
  ring: {
    position: 'absolute',
    top: -RING_OUTSET,
    left: -RING_OUTSET,
    right: -RING_OUTSET,
    bottom: -RING_OUTSET,
    borderWidth: borderWidth.regular,
    borderColor: colors.accent,
    borderRadius: borderRadius.print,
  },
  smallNumber: {
    fontSize: 11,
    lineHeight: 14,
  },
  plainNumber: {
    marginTop: 22,
  },
});
