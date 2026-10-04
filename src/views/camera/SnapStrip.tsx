import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { clampStripDrag, snapStripIndex } from './cameraGeometry';

/** Design: `transition: transform 0.25s ease`. */
const SETTLE_TIMING = { duration: 250, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
const PAN_ACTIVATE_X = 5;
const PAN_FAIL_Y = 14;
/** Bands that fake the design's edge `mask-image` fade (no masking needed). */
const FADE_BANDS = 8;

export interface SnapStripProps {
  count: number;
  index: number;
  onSelect: (index: number) => void;
  /** Full strip width (the pane); the selected item sits in its centre. */
  width: number;
  itemWidth: number;
  height: number;
  /** Renders item `i`; `active` = under the pointer (follows the finger while dragging). */
  renderItem: (i: number, active: boolean) => ReactNode;
  /** Fraction of the width faded out at each edge (design mask: 22% / 16%). */
  fade: number;
  fadeColor: string;
  accessibilityLabel: string;
  accessibilityValue: string;
}

/**
 * Horizontal strip of items that snaps one under the centre pointer: drag it like a ruler
 * or tap an item to bring it to the centre. Screen readers get an adjustable control.
 */
export function SnapStrip({
  count,
  index,
  onSelect,
  width,
  itemWidth,
  height,
  renderItem,
  fade,
  fadeColor,
  accessibilityLabel,
  accessibilityValue,
}: SnapStripProps) {
  const base = useCallback(
    (i: number) => {
      'worklet';
      return width / 2 - itemWidth / 2 - i * itemWidth;
    },
    [width, itemWidth],
  );

  const offset = useSharedValue(base(index));
  const current = useSharedValue(index);
  const start = useSharedValue(index);
  const hover = useSharedValue(index);
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
    offset.set(withTiming(base(index), SETTLE_TIMING));
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

  const pan = Gesture.Pan()
    .activeOffsetX([-PAN_ACTIVATE_X, PAN_ACTIVATE_X])
    .failOffsetY([-PAN_FAIL_Y, PAN_FAIL_Y])
    .onStart(() => {
      start.set(current.get());
    })
    .onUpdate((event) => {
      const from = start.get();
      const delta = clampStripDrag(from, event.translationX, count, itemWidth);
      offset.set(base(from) + delta);
      hover.set(snapStripIndex(from, delta, count, itemWidth));
    })
    .onEnd((event) => {
      const from = start.get();
      const next = snapStripIndex(from, clampStripDrag(from, event.translationX, count, itemWidth), count, itemWidth);
      offset.set(withTiming(base(next), SETTLE_TIMING));
      scheduleOnRN(commit, next);
    });

  const tap = Gesture.Tap().onEnd((event, success) => {
    if (!success) return;
    scheduleOnRN(commit, current.get() + Math.round((event.x - width / 2) / itemWidth));
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (event.nativeEvent.actionName === 'increment') commit(index + 1);
    if (event.nativeEvent.actionName === 'decrement') commit(index - 1);
  };

  const fadeWidth = width * fade;

  return (
    <GestureDetector gesture={Gesture.Race(pan, tap)}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: accessibilityValue }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={[styles.root, { width, height }]}
      >
        <Animated.View style={[styles.row, { height }, rowStyle]}>
          {Array.from({ length: count }, (_, i) => (
            <View key={i} style={{ width: itemWidth, height }}>
              {renderItem(i, i === active)}
            </View>
          ))}
        </Animated.View>
        <EdgeFade side="left" width={fadeWidth} color={fadeColor} />
        <EdgeFade side="right" width={fadeWidth} color={fadeColor} />
      </View>
    </GestureDetector>
  );
}

/** Stack of bands fading from the body colour to transparent towards the strip's centre. */
function EdgeFade({ side, width, color }: { side: 'left' | 'right'; width: number; color: string }) {
  const band = width / FADE_BANDS;
  return (
    <View pointerEvents="none" style={[styles.fade, side === 'left' ? { left: 0 } : { right: 0 }, { width }]}>
      {Array.from({ length: FADE_BANDS }, (_, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            width: band,
            [side]: i * band,
            backgroundColor: color,
            opacity: 1 - (i + 0.5) / FADE_BANDS,
          }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    overflow: 'hidden',
  },
  row: {
    position: 'absolute',
    left: 0,
    top: 0,
    flexDirection: 'row',
  },
  fade: {
    position: 'absolute',
    top: 0,
    bottom: 0,
  },
});
