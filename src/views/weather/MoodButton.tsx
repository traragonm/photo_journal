import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, View, type AccessibilityActionEvent, type StyleProp, type ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AppText } from '@/components';
import { MOODS } from '@/models';
import { colors, fontFamilies, moodStyles } from '@/theme';
import { useAmbient } from '@/viewmodels/useAmbient';
import { clampStripDrag, snapStripIndex } from '@/views/camera/cameraGeometry';

const SIZE = 56;
const ICON_SIZE = 26;
const DOT_SIZE = 13;
const STRIP_WIDTH = 236;
const STRIP_HEIGHT = 54;
/** Gap between the strip and the button (design: right 66 on a 56 button). */
const STRIP_GAP = 10;
const ITEM = 64;
const ITEM_HEIGHT = 50;
/** Window the chosen mood sits in (design: left 84, 64 × 42). */
const WINDOW_LEFT = 84;
const WINDOW_TOP = 4;
const WINDOW_HEIGHT = 42;
const WINDOW_CENTRE = WINDOW_LEFT + ITEM / 2;
const PAN_ACTIVATE = 6;
const PAN_FAIL_Y = 16;
/** Design: `transition: transform 0.2s ease`. */
const SLIDE_TIMING = { duration: 200, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };

const rowOffset = (i: number) => {
  'worklet';
  return WINDOW_CENTRE - ITEM / 2 - i * ITEM;
};

export interface MoodButtonProps {
  /** Placement on the page (the design puts it bottom-right). */
  style?: StyleProp<ViewStyle>;
}

/**
 * Floating "trạng thái" button: an amber LCD face showing the current mood. Tap to open the
 * strip of moods (tap one to pick it), or hold and slide sideways to roll through them.
 * The mood is shared with the camera's mood drum and saved on the next photos.
 */
export function MoodButton({ style }: MoodButtonProps) {
  const { mood, setMood } = useAmbient();
  const index = Math.max(0, MOODS.indexOf(mood));
  const [open, setOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [hovered, setHovered] = useState(index);
  const [shownIndex, setShownIndex] = useState(index);
  if (shownIndex !== index) {
    setShownIndex(index);
    setHovered(index);
  }

  const offset = useSharedValue(rowOffset(index));
  const current = useSharedValue(index);
  const start = useSharedValue(index);
  const hover = useSharedValue(index);

  useEffect(() => {
    current.set(index);
    hover.set(index);
    offset.set(withTiming(rowOffset(index), SLIDE_TIMING));
  }, [index, current, hover, offset]);

  useAnimatedReaction(
    () => hover.get(),
    (next, previous) => {
      if (next !== previous) scheduleOnRN(setHovered, next);
    },
  );

  const pick = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(MOODS.length - 1, next));
      setOpen(false);
      setDragging(false);
      setHovered(clamped);
      offset.set(withTiming(rowOffset(clamped), SLIDE_TIMING));
      if (clamped !== index) setMood(MOODS[clamped]);
    },
    [index, offset, setMood],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-PAN_ACTIVATE, PAN_ACTIVATE])
    .failOffsetY([-PAN_FAIL_Y, PAN_FAIL_Y])
    .onStart(() => {
      start.set(current.get());
      scheduleOnRN(setDragging, true);
    })
    .onUpdate((event) => {
      const from = start.get();
      const delta = clampStripDrag(from, event.translationX, MOODS.length, ITEM);
      offset.set(rowOffset(from) + delta);
      hover.set(snapStripIndex(from, delta, MOODS.length, ITEM));
    })
    .onEnd((event) => {
      const from = start.get();
      const delta = clampStripDrag(from, event.translationX, MOODS.length, ITEM);
      scheduleOnRN(pick, snapStripIndex(from, delta, MOODS.length, ITEM));
    })
    .onFinalize(() => {
      scheduleOnRN(setDragging, false);
    });

  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success) scheduleOnRN(setOpen, (value: boolean) => !value);
  });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    const { actionName } = event.nativeEvent;
    if (actionName === 'increment') pick(index + 1);
    if (actionName === 'decrement') pick(index - 1);
    if (actionName === 'activate') setOpen((value) => !value);
  };

  const showStrip = open || dragging;
  const face = moodStyles[mood];

  return (
    <View style={[styles.root, style]} pointerEvents="box-none">
      {showStrip ? (
        <View style={styles.strip} accessibilityRole="radiogroup" accessibilityLabel="Chọn trạng thái">
          <View pointerEvents="none" style={styles.window} />
          <Animated.View style={[styles.row, rowStyle]}>
            {MOODS.map((item, i) => {
              const lit = i === hovered;
              const color = lit ? colors.cameraLcdText : colors.cameraLcdDim;
              return (
                <Pressable
                  key={item}
                  onPress={() => pick(i)}
                  accessibilityRole="radio"
                  accessibilityLabel={moodStyles[item].label}
                  accessibilityState={{ selected: i === index }}
                  style={styles.item}
                >
                  <MaterialCommunityIcons name={moodStyles[item].icon} size={18} color={color} style={styles.glow} />
                  <AppText numberOfLines={1} style={[styles.itemLabel, styles.glow, { color }]}>
                    {moodStyles[item].label}
                  </AppText>
                </Pressable>
              );
            })}
          </Animated.View>
        </View>
      ) : null}

      <GestureDetector gesture={Gesture.Race(pan, tap)}>
        <View
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel={`Trạng thái: ${face.label}. Giữ và kéo ngang để đổi`}
          accessibilityState={{ expanded: showStrip }}
          accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }, { name: 'activate' }]}
          onAccessibilityAction={onAccessibilityAction}
          style={styles.button}
        >
          <MaterialCommunityIcons name={face.icon} size={ICON_SIZE} color={colors.cameraLcdText} style={styles.glow} />
          <View style={styles.dot} />
        </View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  /** Wide enough for the strip too: Android drops touches outside a parent's bounds. */
  root: {
    position: 'absolute',
    width: STRIP_WIDTH + STRIP_GAP + SIZE,
    height: SIZE,
    zIndex: 30,
    elevation: 30,
  },
  button: {
    position: 'absolute',
    right: 0,
    top: 0,
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.cameraLcd,
    borderWidth: 2,
    borderColor: colors.cameraLcdBorder,
    boxShadow: `0 0 0 1px ${colors.cameraBezel}, 0 0 0 4px ${colors.frameWhite}, 0 10px 22px ${colors.moodButtonShadow}, inset 0 2px 8px ${colors.cameraLcdShadow}`,
  },
  dot: {
    position: 'absolute',
    right: 1,
    top: 1,
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    backgroundColor: colors.cameraAmber,
    boxShadow: `0 0 0 2px ${colors.cameraLcd}, 0 0 6px ${colors.cameraAmberGlow}`,
  },
  strip: {
    position: 'absolute',
    left: 0,
    top: 1,
    width: STRIP_WIDTH,
    height: STRIP_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: colors.cameraLcd,
    borderWidth: 2,
    borderColor: colors.cameraLcdBorder,
    boxShadow: `0 10px 24px ${colors.moodButtonShadow}, 0 0 0 1px ${colors.cameraBezel}, inset 0 2px 8px ${colors.cameraLcdShadow}`,
  },
  window: {
    position: 'absolute',
    left: WINDOW_LEFT,
    top: WINDOW_TOP,
    width: ITEM,
    height: WINDOW_HEIGHT,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.cameraAmber,
    boxShadow: `0 0 8px ${colors.cameraAmberGlow}`,
  },
  row: {
    position: 'absolute',
    left: 0,
    top: 0,
    height: ITEM_HEIGHT,
    flexDirection: 'row',
  },
  item: {
    width: ITEM,
    height: ITEM_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  itemLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
    lineHeight: 13,
  },
  glow: {
    textShadowColor: colors.cameraLcdGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 6,
  },
});
