import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { FrameType } from '@/models';
import { borderRadius, frameColors, printFormats, shadows, type FrameColorStyle } from '@/theme';

export interface PolaroidFrameProps {
  /** Outer width of the print in points; height follows the print format. */
  width: number;
  /** Print format (Mini / Square / Wide) — sets the photo window proportions. */
  frameType?: FrameType;
  /** Border colour style (from `useFrameStyle()`); defaults to white. */
  colorStyle?: FrameColorStyle;
  /** Tilt in degrees (use `rotationFor(id)` for stable values). */
  rotation?: number;
  /** The photo window content. */
  image: ReactNode;
  /** Content in the thick bottom strip (caption, time). */
  footer?: ReactNode;
  shadow?: 'none' | 'soft' | 'print' | 'printLifted' | 'viewfinder';
  style?: StyleProp<ViewStyle>;
}

/** Size of a print of the given width and format (whole print + photo window + side border). */
export function printGeometry(width: number, frameType: FrameType = 'square') {
  const format = printFormats[frameType];
  const scale = width / format.w;
  const border = ((format.w - format.iw) / 2) * scale;
  return {
    width,
    height: format.h * scale,
    imageWidth: format.iw * scale,
    imageHeight: format.ih * scale,
    border,
  };
}

/**
 * A physical Polaroid / Instax print: coloured border, thicker bottom strip,
 * warm shadow, slight tilt. Purely presentational — reused by diary prints,
 * the camera viewfinder, map pins and calendar thumbnails.
 */
export function PolaroidFrame({
  width,
  frameType = 'square',
  colorStyle = frameColors.white,
  rotation = 0,
  image,
  footer,
  shadow = 'print',
  style,
}: PolaroidFrameProps) {
  const geometry = printGeometry(width, frameType);
  return (
    <View
      style={[
        styles.frame,
        shadows[shadow],
        {
          width: geometry.width,
          height: geometry.height,
          paddingTop: geometry.border,
          paddingHorizontal: geometry.border,
          backgroundColor: colorStyle.fill,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      <View style={[styles.window, { width: geometry.imageWidth, height: geometry.imageHeight }]}>{image}</View>
      <View style={[styles.footer, { paddingHorizontal: geometry.border / 4 }]}>{footer}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: borderRadius.print,
  },
  window: {
    overflow: 'hidden',
  },
  footer: {
    flex: 1,
    justifyContent: 'center',
  },
});
