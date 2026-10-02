import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { colors, durations } from '@/theme';

/** Share of the flash spent ramping up; the rest is the fade-out. */
const RISE_RATIO = 0.15;

/** Full-pane white pop on every exposure. `trigger` increments per capture. */
export function FlashOverlay({ trigger }: { trigger: number }) {
  const opacity = useSharedValue(0);

  useEffect(() => {
    if (trigger === 0) return;
    const rise = Math.round(durations.flash * RISE_RATIO);
    opacity.set(
      withSequence(
        withTiming(1, { duration: rise }),
        withTiming(0, { duration: durations.flash - rise, easing: Easing.out(Easing.quad) }),
      ),
    );
  }, [trigger, opacity]);

  const style = useAnimatedStyle(() => ({ opacity: opacity.get() }));

  return (
    <Animated.View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      style={[StyleSheet.absoluteFill, styles.flash, style]}
    />
  );
}

const styles = StyleSheet.create({
  flash: {
    backgroundColor: colors.flash,
  },
});
