import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedReaction, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { colors } from '@/theme';
import { clampStripDrag, snapStripIndex } from './cameraGeometry';

const PAN_ACTIVATE = 4;
const PAN_FAIL_CROSS = 14;
const CHEVRON_SIZE = 14;
const BORDER = 2;
const RADIUS = 12;
const OVERLAY_RADIUS = 14;
const HIGHLIGHT_RADIUS = 10;
const OVERLAY_Z = 20;

export interface LcdDrumGeometry {
  width: number;
  height: number;
  /** Item pitch inside the pop-out strip. */
  item: number;
  /** Pop-out strip box, relative to the drum. */
  overlay: { left: number; top: number; width: number; height: number };
  /** Highlight box (the drum's window) inside the strip. */
  highlight: { left: number; top: number; width: number; height: number };
}

export interface LcdDrumProps {
  orientation: 'horizontal' | 'vertical';
  /** Design geometry (multiplied by `scale`). */
  geometry: LcdDrumGeometry;
  scale: number;
  count: number;
  index: number;
  onSelect: (index: number) => void;
  /** The drum's face: the current choice, lit. */
  face: ReactNode;
  /** Item `i` in the pop-out strip; `active` = under the window. */
  renderItem: (i: number, active: boolean) => ReactNode;
  accessibilityLabel: string;
  accessibilityValue: string;
}

/**
 * Amber LCD selector drum. Drag along it to roll the choices — a strip pops out showing
 * the neighbours while the finger is down — or tap either end (the chevrons) to step.
 */
export function LcdDrum({
  orientation,
  geometry,
  scale,
  count,
  index,
  onSelect,
  face,
  renderItem,
  accessibilityLabel,
  accessibilityValue,
}: LcdDrumProps) {
  const u = (value: number) => value * scale;
  const vertical = orientation === 'vertical';
  const item = u(geometry.item);
  const { overlay, highlight } = geometry;
  /** Strip offset that puts item `i` in the window. */
  const windowCentre = u(vertical ? highlight.top + highlight.height / 2 : highlight.left + highlight.width / 2);
  const base = useCallback(
    (i: number) => {
      'worklet';
      return windowCentre - item / 2 - i * item;
    },
    [windowCentre, item],
  );

  const offset = useSharedValue(base(index));
  const current = useSharedValue(index);
  const start = useSharedValue(index);
  const hover = useSharedValue(index);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(index);
  // A new selection from outside resets the highlight (adjusting state while rendering, per React docs).
  const [shownIndex, setShownIndex] = useState(index);
  if (shownIndex !== index) {
    setShownIndex(index);
    setActive(index);
  }

  useEffect(() => {
    current.set(index);
    hover.set(index);
    offset.set(base(index));
  }, [index, base, current, hover, offset]);

  useAnimatedReaction(
    () => hover.get(),
    (next, previous) => {
      if (next !== previous) scheduleOnRN(setActive, next);
    },
  );

  const commit = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(count - 1, next));
      setActive(clamped);
      if (clamped !== index) onSelect(clamped);
    },
    [count, index, onSelect],
  );

  const pan = (
    vertical
      ? Gesture.Pan().activeOffsetY([-PAN_ACTIVATE, PAN_ACTIVATE]).failOffsetX([-PAN_FAIL_CROSS, PAN_FAIL_CROSS])
      : Gesture.Pan().activeOffsetX([-PAN_ACTIVATE, PAN_ACTIVATE]).failOffsetY([-PAN_FAIL_CROSS, PAN_FAIL_CROSS])
  )
    .onStart(() => {
      start.set(current.get());
      offset.set(base(current.get()));
      scheduleOnRN(setOpen, true);
    })
    .onUpdate((event) => {
      const from = start.get();
      const delta = clampStripDrag(from, vertical ? event.translationY : event.translationX, count, item);
      offset.set(base(from) + delta);
      hover.set(snapStripIndex(from, delta, count, item));
    })
    .onEnd((event) => {
      const from = start.get();
      const delta = clampStripDrag(from, vertical ? event.translationY : event.translationX, count, item);
      scheduleOnRN(commit, snapStripIndex(from, delta, count, item));
    })
    .onFinalize(() => {
      scheduleOnRN(setOpen, false);
    });

  const tap = Gesture.Tap().onEnd((event, success) => {
    if (!success) return;
    const before = vertical ? event.y < u(geometry.height) / 2 : event.x < u(geometry.width) / 2;
    scheduleOnRN(commit, current.get() + (before ? -1 : 1));
  });

  const rowStyle = useAnimatedStyle(() =>
    vertical ? { transform: [{ translateY: offset.get() }] } : { transform: [{ translateX: offset.get() }] },
  );

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') commit(index + 1);
    if (event.nativeEvent.actionName === 'decrement') commit(index - 1);
  };

  const chevron = (name: 'chevron-left' | 'chevron-right' | 'chevron-up' | 'chevron-down') => (
    <MaterialCommunityIcons name={name} size={u(CHEVRON_SIZE)} color={colors.cameraLcdDim} />
  );

  return (
    <View style={[{ width: u(geometry.width), height: u(geometry.height) }, open && styles.raised]}>
      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={accessibilityLabel}
          accessibilityValue={{ text: accessibilityValue }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
          onAccessibilityAction={onAccessibilityAction}
          style={[
            styles.face,
            vertical ? styles.faceVertical : styles.faceHorizontal,
            { borderRadius: u(RADIUS), paddingHorizontal: vertical ? 0 : u(3), paddingVertical: vertical ? u(2) : 0 },
          ]}
        >
          {chevron(vertical ? 'chevron-up' : 'chevron-left')}
          {face}
          {chevron(vertical ? 'chevron-down' : 'chevron-right')}
        </View>
      </GestureDetector>

      {open ? (
        <View
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
          style={[
            styles.overlay,
            {
              left: u(overlay.left),
              top: u(overlay.top),
              width: u(overlay.width),
              height: u(overlay.height),
              borderRadius: u(OVERLAY_RADIUS),
            },
          ]}
        >
          <View
            style={[
              styles.highlight,
              {
                left: u(highlight.left),
                top: u(highlight.top),
                width: u(highlight.width),
                height: u(highlight.height),
                borderRadius: u(HIGHLIGHT_RADIUS),
              },
            ]}
          />
          <Animated.View style={[styles.row, vertical ? styles.column : null, rowStyle]}>
            {Array.from({ length: count }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.cell,
                  vertical ? { width: u(overlay.width) - BORDER * 2, height: item } : { width: item, height: u(overlay.height) - BORDER * 2 },
                ]}
              >
                {renderItem(i, i === active)}
              </View>
            ))}
          </Animated.View>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  raised: {
    zIndex: OVERLAY_Z,
    elevation: OVERLAY_Z,
  },
  face: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cameraLcd,
    borderWidth: BORDER,
    borderColor: colors.cameraLcdBorder,
    boxShadow: `inset 0 2px 8px ${colors.cameraLcdShadow}, 0 0 0 1px ${colors.cameraBezel}`,
  },
  faceHorizontal: {
    flexDirection: 'row',
  },
  faceVertical: {
    flexDirection: 'column',
  },
  overlay: {
    position: 'absolute',
    overflow: 'hidden',
    backgroundColor: colors.cameraLcd,
    borderWidth: BORDER,
    borderColor: colors.cameraLcdBorder,
    boxShadow: `0 10px 24px ${colors.cameraSwitchThumbShadow}, 0 0 0 1px ${colors.cameraBezel}, inset 0 2px 8px ${colors.cameraLcdShadow}`,
  },
  highlight: {
    position: 'absolute',
    borderWidth: BORDER,
    borderColor: colors.cameraAmber,
    boxShadow: `0 0 8px ${colors.cameraAmberGlow}`,
  },
  row: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
  },
  column: {
    flexDirection: 'column',
  },
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
