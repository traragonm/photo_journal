import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { borderRadius, colors, layout, springs } from '@/theme';
import { PressableScale } from './PressableScale';

export interface ToggleProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  accessibilityLabel: string;
  disabled?: boolean;
}

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const KNOB_SIZE = 20;
const KNOB_INSET = (TRACK_HEIGHT - KNOB_SIZE) / 2;
const KNOB_TRAVEL = TRACK_WIDTH - KNOB_SIZE - KNOB_INSET * 2;
const DISABLED_OPACITY = 0.4;

/** Design toggle: ink track when on, hairline-beige when off, white knob. Same on every platform. */
export function Toggle({ value, onValueChange, accessibilityLabel, disabled = false }: ToggleProps) {
  const offset = useSharedValue(value ? KNOB_TRAVEL : 0);
  useEffect(() => {
    offset.set(withSpring(value ? KNOB_TRAVEL : 0, springs.snappy));
  }, [value, offset]);
  const knobStyle = useAnimatedStyle(() => ({ transform: [{ translateX: offset.get() }] }));

  return (
    <PressableScale
      onPress={() => onValueChange(!value)}
      disabled={disabled}
      hitSlop={layout.hitSlop}
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value, disabled }}
      style={[
        styles.track,
        { backgroundColor: value ? colors.ink : colors.hairline },
        disabled && styles.disabled,
      ]}
    >
      <Animated.View style={[styles.knob, knobStyle]} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: borderRadius.pill,
    padding: KNOB_INSET,
    justifyContent: 'center',
  },
  knob: {
    width: KNOB_SIZE,
    height: KNOB_SIZE,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 2,
    elevation: 2,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});
