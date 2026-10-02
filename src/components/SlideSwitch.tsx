import { useCallback, useEffect } from 'react';
import { StyleSheet, View, type AccessibilityActionEvent } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { colors, fontFamilies } from '@/theme';
import { AppText } from './AppText';

export interface SlideSwitchOption<T> {
  value: T;
  label: string;
}

export interface SlideSwitchProps<T> {
  options: readonly SlideSwitchOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /** 'dark' = on the camera body, 'light' = on the paper Settings sheet. */
  tone?: 'dark' | 'light';
  /** Overall width (design: 110). */
  width?: number;
  disabled?: boolean;
}

const DEFAULT_WIDTH = 110;
/** Whole control incl. labels — also the touch target. */
const HEIGHT = 44;
const TRACK_TOP = 4;
const TRACK_HEIGHT = 22;
const THUMB_TOP = 7;
const THUMB_WIDTH = 38;
const THUMB_HEIGHT = 16;
/** Gap between the track's inner edge and the thumb at either end. */
const THUMB_INSET = 3;
const KNURL_STRIPE = 2;
const KNURL_STRIPES = THUMB_WIDTH / (KNURL_STRIPE * 2);
const LABEL_TOP = 30;
const LABEL_WIDTH = 40;
/** Design: label box left = thumb left − 2. */
const LABEL_SHIFT = -2;
const LABEL_FONT_SIZE = 9;
const LABEL_LINE_HEIGHT = 12;
/** 0.08em on 9px. */
const LABEL_LETTER_SPACING = 0.72;
/** Design: `transition: left 0.18s ease`. */
const SLIDE_TIMING = { duration: 180, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
const PAN_ACTIVATE_X = 4;
const PAN_FAIL_Y = 12;
const DISABLED_OPACITY = 0.4;

const TONES = {
  dark: {
    track: colors.cameraSwitchTrack,
    thumbShadow: colors.cameraSwitchThumbShadow,
    thumbHighlight: colors.cameraSwitchThumbHighlight,
    active: colors.onInk,
    idle: colors.cameraLabelIdle,
  },
  light: {
    track: colors.cameraSwitchTrackLight,
    thumbShadow: colors.cameraSwitchThumbShadowLight,
    thumbHighlight: colors.cameraSwitchThumbHighlightLight,
    active: colors.ink,
    idle: colors.muted,
  },
} as const;

/**
 * Hardware-style multi-position slide switch: recessed track, knurled thumb, tiny labels.
 * Tap a position or drag the thumb; screen readers get an adjustable control.
 */
export function SlideSwitch<T>({
  options,
  value,
  onChange,
  accessibilityLabel,
  tone = 'dark',
  width = DEFAULT_WIDTH,
  disabled = false,
}: SlideSwitchProps<T>) {
  const palette = TONES[tone];
  const count = options.length;
  const lastIndex = Math.max(0, count - 1);
  const step = lastIndex > 0 ? (width - THUMB_INSET * 2 - THUMB_WIDTH) / lastIndex : 0;
  const found = options.findIndex((option) => Object.is(option.value, value));
  const index = Math.max(0, found);
  const thumbLeft = (i: number) => THUMB_INSET + i * step;

  const position = useSharedValue(thumbLeft(index));
  const dragStart = useSharedValue(0);

  useEffect(() => {
    position.set(withTiming(THUMB_INSET + index * step, SLIDE_TIMING));
  }, [index, step, position]);

  const select = useCallback(
    (next: number) => {
      const clamped = Math.min(lastIndex, Math.max(0, next));
      if (clamped !== index) {
        onChange(options[clamped].value);
      } else {
        // Snap back after a drag that ended on the same position.
        position.set(withTiming(THUMB_INSET + clamped * step, SLIDE_TIMING));
      }
    },
    [index, lastIndex, onChange, options, position, step],
  );

  const nearestIndex = (left: number) => {
    'worklet';
    return step > 0 ? Math.round((left - THUMB_INSET) / step) : 0;
  };

  const pan = Gesture.Pan()
    .enabled(!disabled)
    .activeOffsetX([-PAN_ACTIVATE_X, PAN_ACTIVATE_X])
    .failOffsetY([-PAN_FAIL_Y, PAN_FAIL_Y])
    .onStart(() => {
      dragStart.set(position.get());
    })
    .onUpdate((event) => {
      const min = THUMB_INSET;
      const max = THUMB_INSET + lastIndex * step;
      position.set(Math.min(max, Math.max(min, dragStart.get() + event.translationX)));
    })
    .onEnd(() => {
      scheduleOnRN(select, nearestIndex(position.get()));
    });

  const tap = Gesture.Tap()
    .enabled(!disabled)
    .onEnd((event, success) => {
      if (!success) return;
      scheduleOnRN(select, nearestIndex(event.x - THUMB_WIDTH / 2));
    });

  const gesture = Gesture.Race(pan, tap);

  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: position.get() }] }));

  const onAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (disabled) return;
    if (event.nativeEvent.actionName === 'increment') select(index + 1);
    if (event.nativeEvent.actionName === 'decrement') select(index - 1);
  };

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="adjustable"
        accessibilityLabel={accessibilityLabel}
        accessibilityValue={{ text: options[index]?.label ?? '' }}
        accessibilityState={{ disabled }}
        accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
        onAccessibilityAction={onAccessibilityAction}
        style={[styles.root, { width }, disabled && styles.disabled]}
      >
        <View
          style={[
            styles.track,
            { width, backgroundColor: palette.track, boxShadow: `inset 0 2px 4px ${colors.cameraSwitchTrackShadow}` },
          ]}
        />
        <Animated.View
          style={[
            styles.thumb,
            { boxShadow: `0 2px 4px ${palette.thumbShadow}, inset 0 1px 0 ${palette.thumbHighlight}` },
            thumbStyle,
          ]}
        >
          <View style={styles.knurl}>
            {Array.from({ length: KNURL_STRIPES }, (_, i) => (
              <View key={i} style={styles.knurlStripe} />
            ))}
          </View>
        </Animated.View>
        {options.map((option, i) => (
          <AppText
            key={option.label}
            numberOfLines={1}
            style={[
              styles.label,
              { left: thumbLeft(i) + LABEL_SHIFT, color: i === index ? palette.active : palette.idle },
            ]}
          >
            {option.label}
          </AppText>
        ))}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  root: {
    height: HEIGHT,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  track: {
    position: 'absolute',
    left: 0,
    top: TRACK_TOP,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1,
    borderColor: colors.cameraSwitchTrackBorder,
  },
  thumb: {
    position: 'absolute',
    left: 0,
    top: THUMB_TOP,
    width: THUMB_WIDTH,
    height: THUMB_HEIGHT,
    borderRadius: THUMB_HEIGHT / 2,
    backgroundColor: colors.cameraSwitchKnurlLight,
  },
  knurl: {
    ...StyleSheet.absoluteFill,
    flexDirection: 'row',
    borderRadius: THUMB_HEIGHT / 2,
    overflow: 'hidden',
    paddingLeft: KNURL_STRIPE,
    gap: KNURL_STRIPE,
  },
  knurlStripe: {
    width: KNURL_STRIPE,
    height: '100%',
    backgroundColor: colors.cameraSwitchKnurlDark,
  },
  label: {
    position: 'absolute',
    top: LABEL_TOP,
    width: LABEL_WIDTH,
    textAlign: 'center',
    fontFamily: fontFamilies.bold,
    fontSize: LABEL_FONT_SIZE,
    lineHeight: LABEL_LINE_HEIGHT,
    letterSpacing: LABEL_LETTER_SPACING,
  },
});
