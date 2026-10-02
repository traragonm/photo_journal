import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { SlideSwitch, type SlideSwitchOption } from '@/components';
import type { FlashMode, TimerSeconds } from '@/models';
import { colors, spacing } from '@/theme';

const FLASH_OPTIONS: readonly SlideSwitchOption<FlashMode>[] = [
  { value: 'off', label: 'TẮT' },
  { value: 'auto', label: 'AUTO' },
  { value: 'on', label: 'BẬT' },
];
const TIMER_OPTIONS: readonly SlideSwitchOption<TimerSeconds>[] = [
  { value: 0, label: 'TẮT' },
  { value: 3, label: '3s' },
  { value: 10, label: '10s' },
];
const FLASH_LED: Record<FlashMode, string> = {
  on: colors.cameraLedOn,
  auto: colors.cameraLedAuto,
  off: colors.cameraLedOff,
};

const ICON_SIZE = 18;
const LED_SIZE = 6;

export interface CameraTopBarProps {
  flashMode: FlashMode;
  timerSeconds: TimerSeconds;
  onChangeFlash: (mode: FlashMode) => void;
  onChangeTimer: (seconds: TimerSeconds) => void;
  /** Width of each switch (design 110; narrower on small phones). */
  switchWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/** Flash · self-timer — two hardware slide switches with status LEDs on the camera body. */
export function CameraTopBar({
  flashMode,
  timerSeconds,
  onChangeFlash,
  onChangeTimer,
  switchWidth,
  style,
}: CameraTopBarProps) {
  return (
    <View style={[styles.row, style]} pointerEvents="box-none">
      <View style={styles.group}>
        <Indicator icon="flash-outline" led={FLASH_LED[flashMode]} />
        <SlideSwitch
          options={FLASH_OPTIONS}
          value={flashMode}
          onChange={onChangeFlash}
          width={switchWidth}
          accessibilityLabel="Đèn flash"
        />
      </View>
      <View style={styles.group}>
        <Indicator icon="timer-outline" led={timerSeconds > 0 ? colors.cameraLedOn : colors.cameraLedOff} />
        <SlideSwitch
          options={TIMER_OPTIONS}
          value={timerSeconds}
          onChange={onChangeTimer}
          width={switchWidth}
          accessibilityLabel="Hẹn giờ"
        />
      </View>
    </View>
  );
}

/** Small engraved icon with a status LED below it (decorative; the switch carries the a11y value). */
function Indicator({ icon, led }: { icon: keyof typeof Ionicons.glyphMap; led: string }) {
  return (
    <View style={styles.indicator} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
      <Ionicons name={icon} size={ICON_SIZE} color={colors.cameraSwitchIcon} />
      <View style={[styles.led, { backgroundColor: led }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  group: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  indicator: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  led: {
    width: LED_SIZE,
    height: LED_SIZE,
    borderRadius: LED_SIZE / 2,
  },
});
