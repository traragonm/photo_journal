import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import type { PhotoEntry } from '@/models';
import { borderRadius, shadows } from '@/theme';
import { useFrameStyle } from '@/viewmodels/shared';
import { PhotoImage } from './PhotoImage';
import { PressableScale } from './PressableScale';

export interface PhotoThumbnailProps {
  photo: PhotoEntry;
  /** Print width; height is width × 1.25 (portrait mini-print, as in the design's lists). */
  width?: number;
  rotation?: number;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

const DEFAULT_WIDTH = 40;
const ASPECT = 1.25;
const SIDE_RATIO = 0.075;
const BOTTOM_RATIO = 0.275;

/** Tiny print with a thicker bottom edge (map list rows, calendar cells, last-shot button). */
export function PhotoThumbnail({
  photo,
  width = DEFAULT_WIDTH,
  rotation = 0,
  onPress,
  style,
  accessibilityLabel = 'Mở ảnh',
}: PhotoThumbnailProps) {
  const { frame } = useFrameStyle();
  const side = Math.max(2, Math.round(width * SIDE_RATIO));
  const content = (
    <View
      style={[
        styles.frame,
        shadows.soft,
        {
          width,
          height: width * ASPECT,
          padding: side,
          paddingBottom: Math.round(width * BOTTOM_RATIO),
          backgroundColor: frame.fill,
          transform: [{ rotate: `${rotation}deg` }],
        },
        style,
      ]}
    >
      <PhotoImage
        uri={photo.imageUri}
        isAvailable={photo.isImageAvailable}
        filter={photo.filter}
        style={styles.image}
        compact
      />
    </View>
  );
  if (!onPress) return content;
  return (
    <PressableScale onPress={onPress} accessibilityRole="imagebutton" accessibilityLabel={accessibilityLabel}>
      {content}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  frame: {
    borderRadius: borderRadius.xs,
  },
  image: {
    flex: 1,
  },
});
