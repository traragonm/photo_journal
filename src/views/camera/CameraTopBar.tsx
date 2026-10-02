import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { Ionicons } from '@expo/vector-icons';
import { AppText, IconButton } from '@/components';
import type { FlashMode, TimerSeconds } from '@/models';
import { borderRadius, colors, fontFamilies, fontSizes, spacing } from '@/theme';

type IconName = keyof typeof Ionicons.glyphMap;

const FLASH: Record<FlashMode, { icon: IconName; spoken: string; badge: string | null }> = {
  off: { icon: 'flash-off-outline', spoken: 'tắt', badge: null },
  on: { icon: 'flash', spoken: 'bật', badge: null },
  auto: { icon: 'flash-outline', spoken: 'tự động', badge: 'A' },
};

const TIMER_SPOKEN: Record<TimerSeconds, string> = { 0: 'tắt', 3: '3 giây', 10: '10 giây' };
const BADGE_MIN_SIZE = 16;
const BADGE_OFFSET = -2;

export interface CameraTopBarProps {
  flashMode: FlashMode;
  timerSeconds: TimerSeconds;
  disabled: boolean;
  onCycleFlash: () => void;
  onCycleTimer: () => void;
  onFlip: () => void;
  style?: StyleProp<ViewStyle>;
}

/** Flash · self-timer · flip — round translucent buttons on the camera body. */
export function CameraTopBar({
  flashMode,
  timerSeconds,
  disabled,
  onCycleFlash,
  onCycleTimer,
  onFlip,
  style,
}: CameraTopBarProps) {
  const flash = FLASH[flashMode];
  return (
    <View style={[styles.row, style]} pointerEvents="box-none">
      <View>
        <IconButton
          icon={flash.icon}
          tone="camera"
          onPress={onCycleFlash}
          accessibilityLabel={`Đèn flash: ${flash.spoken}`}
        />
        {flash.badge ? <Badge text={flash.badge} /> : null}
      </View>
      <View>
        <IconButton
          icon="timer-outline"
          tone="camera"
          onPress={onCycleTimer}
          accessibilityLabel={`Hẹn giờ: ${TIMER_SPOKEN[timerSeconds]}`}
        />
        {timerSeconds > 0 ? <Badge text={`${timerSeconds}`} /> : null}
      </View>
      <IconButton
        icon="sync-outline"
        tone="camera"
        onPress={onFlip}
        disabled={disabled}
        accessibilityLabel="Đổi camera trước/sau"
      />
    </View>
  );
}

function Badge({ text }: { text: string }) {
  return (
    <View pointerEvents="none" style={styles.badge} importantForAccessibility="no-hide-descendants">
      <AppText style={styles.badgeText}>{text}</AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    right: BADGE_OFFSET,
    top: BADGE_OFFSET,
    minWidth: BADGE_MIN_SIZE,
    height: BADGE_MIN_SIZE,
    paddingHorizontal: spacing.xxs,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    fontFamily: fontFamilies.bold,
    fontSize: fontSizes.micro,
    lineHeight: BADGE_MIN_SIZE,
    color: colors.white,
  },
});
