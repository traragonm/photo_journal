import { StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { borderRadius, colors, layout } from '@/theme';
import { PressableScale } from './PressableScale';

export interface IconButtonProps {
  icon: keyof typeof Ionicons.glyphMap;
  accessibilityLabel: string;
  onPress: () => void;
  /** 'paper' = chip on light surfaces, 'camera' = translucent on the camera body. */
  tone?: 'paper' | 'camera' | 'plain';
  size?: number;
  iconSize?: number;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

const DEFAULT_ICON_SIZE = 20;
const TONES = {
  paper: { bg: colors.chip, fg: colors.ink },
  camera: { bg: colors.cameraButton, fg: colors.onInk },
  plain: { bg: colors.transparent, fg: colors.ink },
} as const;
const DISABLED_OPACITY = 0.4;

/** Round 44pt icon button (calendar month arrows, camera top controls). */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  tone = 'paper',
  size = layout.iconButtonSize,
  iconSize = DEFAULT_ICON_SIZE,
  disabled = false,
  style,
}: IconButtonProps) {
  const { bg, fg } = TONES[tone];
  return (
    <PressableScale
      onPress={onPress}
      disabled={disabled}
      hitSlop={layout.hitSlop}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      style={[
        styles.base,
        { width: size, height: size, backgroundColor: bg },
        disabled && styles.disabled,
        style,
      ]}
    >
      <Ionicons name={icon} size={iconSize} color={fg} />
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: borderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
});
