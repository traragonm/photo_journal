import { useEffect, type ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { cardEntry, durations, springs } from '@/theme';

export interface AnimatedEntryProps {
  children: ReactNode;
  /** Position in a list, used to stagger the entrance (capped). */
  index?: number;
  style?: StyleProp<ViewStyle>;
}

/** Card entrance: scale 0.9→1, opacity 0→1, staggered by index. */
export function AnimatedEntry({ children, index = 0, style }: AnimatedEntryProps) {
  const progress = useSharedValue(0);
  const scale = useSharedValue<number>(cardEntry.fromScale);

  useEffect(() => {
    const delay = Math.min(index, cardEntry.maxStaggerItems) * cardEntry.staggerMs;
    progress.set(withDelay(delay, withTiming(1, { duration: durations.normal })));
    scale.set(withDelay(delay, withSpring(cardEntry.toScale, springs.gentle)));
  }, [index, progress, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: progress.get(),
    transform: [{ scale: scale.get() }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}
