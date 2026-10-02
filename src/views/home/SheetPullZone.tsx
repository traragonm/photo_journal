import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { springs } from '@/theme';
import { useHomeNav, type Sheet } from './HomeNavigator';

export interface SheetPullZoneProps {
  sheet: Sheet;
  /** 'open' = dragging this zone opens the sheet; 'close' = it closes it. */
  intent: 'open' | 'close';
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/** Fraction of the travel (or a flick) needed to commit an open/close. */
const COMMIT_FRACTION = 0.3;
const FLICK_VELOCITY = 600;
const ACTIVATE_OFFSET = 8;

/**
 * Wrap a handle/edge area with this to make it drag a sheet:
 * Settings comes down from the top, Calendar comes up from the bottom.
 * Tapping still works through the children's own onPress.
 */
export function SheetPullZone({ sheet, intent, children, style }: SheetPullZoneProps) {
  const nav = useHomeNav();
  const progress = nav.sheetProgress[sheet];
  const travel = nav.sheetTravel;
  /** Settings opens downward (+y), Calendar opens upward (−y). */
  const openSign = sheet === 'settings' ? 1 : -1;
  const start = intent === 'open' ? 0 : 1;
  const { openSheet, closeSheet } = nav;

  const pan = Gesture.Pan()
    .activeOffsetY([-ACTIVATE_OFFSET, ACTIVATE_OFFSET])
    .onUpdate((event) => {
      const delta = (event.translationY * openSign) / Math.max(travel.get(), 1);
      progress.set(Math.min(1, Math.max(0, start + delta)));
    })
    .onEnd((event) => {
      const velocity = event.velocityY * openSign;
      const moved = progress.get() - start;
      const shouldOpen =
        intent === 'open'
          ? moved > COMMIT_FRACTION || velocity > FLICK_VELOCITY
          : !(moved < -COMMIT_FRACTION || velocity < -FLICK_VELOCITY);
      progress.set(withSpring(shouldOpen ? 1 : 0, springs.gentle));
      if (shouldOpen) scheduleOnRN(openSheet, sheet);
      else scheduleOnRN(closeSheet);
    });

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={style}>{children}</Animated.View>
    </GestureDetector>
  );
}
