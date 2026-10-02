import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { colors, layout } from '@/theme';
import { PressableScale } from './PressableScale';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

const TRACK_WIDTH = 56;
const TRACK_HEIGHT = 24;
const THUMB_WIDTH = 26;
const THUMB_HEIGHT = 18;
const THUMB_TOP = 2;
const THUMB_OFF = 2;
const THUMB_ON = 26;
const LED_SIZE = 6;
const LED_GAP = 8;
const KNURL_STRIPE = 2;
const KNURL_STRIPES = THUMB_WIDTH / (KNURL_STRIPE * 2);
/** Design: `transition: left 0.18s ease`. */
const SLIDE_TIMING = { duration: 180, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
const DISABLED_OPACITY = 0.4;

/** Hardware-style switch: LED, recessed track, knurled thumb sliding left (off) to right (on). */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false }: ToggleProps) {
  const offset = useSharedValue(value ? THUMB_ON : THUMB_OFF);
  useEffect(() => {
    offset.set(withTiming(value ? THUMB_ON : THUMB_OFF, SLIDE_TIMING));
  }, [value, offset]);
  const thumbStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <PressableScale
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={layout.hitSlop}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      style={[styles.root, disabled && styles.disabled]}
    >
      <View
        style={[
          styles.led,
          value
            ? { backgroundColor: colors.switchLedOn, boxShadow: `0 0 6px ${colors.switchLedGlow}` }
            : { backgroundColor: colors.hairline },
        ]}
      />
      <View style={[styles.track, { boxShadow: `inset 0 2px 4px ${colors.cameraSwitchTrackShadow}` }]}>
        <Animated.View
          style={[
            styles.thumb,
            {
              boxShadow: `0 2px 4px ${colors.cameraSwitchThumbShadowLight}, inset 0 1px 0 ${colors.cameraSwitchThumbHighlightLight}`,
            },
            thumbStyle,
          ]}
        >
          <View style={styles.knurl}>
            {Array.from({ length: KNURL_STRIPES }, (_, i) => (
              <View key={i} style={styles.knurlStripe} />
            ))}
          </View>
        </Animated.View>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  root: { flexDirection: 'row', alignItems: 'center', gap: LED_GAP },
  led: { width: LED_SIZE, height: LED_SIZE, borderRadius: LED_SIZE / 2 },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    borderWidth: 1,
    borderColor: colors.cameraSwitchTrackBorder,
    backgroundColor: colors.cameraSwitchTrackLight,
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
    gap: KNURL_STRIPE,
    paddingLeft: KNURL_STRIPE,
  },
  knurlStripe: { width: KNURL_STRIPE, height: '100%', backgroundColor: colors.cameraSwitchKnurlDark },
  disabled: { opacity: DISABLED_OPACITY },
});
