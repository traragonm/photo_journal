import { Text, type TextProps } from 'react-native';
import { colors, typography, type ColorToken, type TypographyToken } from '@/theme';

export interface AppTextProps extends TextProps {
  variant?: TypographyToken;
  color?: ColorToken;
  align?: 'left' | 'center' | 'right';
}

/** Text primitive bound to typography + color tokens. */
export function AppText({
  variant = 'body',
  color = 'text',
  align,
  style,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[typography[variant], { color: colors[color] }, align ? { textAlign: align } : null, style]}
    />
  );
}
