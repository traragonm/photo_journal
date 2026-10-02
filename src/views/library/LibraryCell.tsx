import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { AppText, PhotoImage, PressableScale } from '@/components';
import type { PhotoEntry } from '@/models';
import { borderRadius, printFormats, shadows, spacing } from '@/theme';
import { formatClock } from '@/utils/date';
import { useFrameStyle } from '@/viewmodels/shared';

/** Small tilt cycle (degrees) so the grid feels hand-placed. */
export const CELL_ROTATIONS = [-2, 1.5, -1, 2, -1.5, 1] as const;

const CAPTION_HEIGHT = 40;
const DATE_FONT_SIZE = 12;
const CAPTION_FONT_SIZE = 15;
const { iw, ih } = printFormats.mini;

export interface LibraryCellProps {
  photo: PhotoEntry;
  width: number;
  rotationIndex: number;
  onPress: (photo: PhotoEntry) => void;
}

function LibraryCellBase({ photo, width, rotationIndex, onPress }: LibraryCellProps) {
  const { frame } = useFrameStyle();
  const date = new Date(photo.createdAt);
  const dateLabel = `${date.getDate()}/${date.getMonth() + 1}`;
  const caption = photo.caption?.trim() || formatClock(photo.createdAt);
  return (
    <PressableScale
      onPress={() => onPress(photo)}
      accessibilityRole="imagebutton"
      accessibilityLabel={`${caption}, ngày ${dateLabel}`}
      style={[
        styles.frame,
        shadows.soft,
        {
          width,
          backgroundColor: frame.fill,
          transform: [{ rotate: `${CELL_ROTATIONS[rotationIndex % CELL_ROTATIONS.length]}deg` }],
        },
      ]}
    >
      <PhotoImage
        uri={photo.imageUri}
        isAvailable={photo.isImageAvailable}
        filter={photo.filter}
        style={{ width: width - spacing.sm - spacing.xs, aspectRatio: iw / ih }}
        compact
      />
      <View style={styles.caption}>
        <AppText
          variant="hand"
          numberOfLines={1}
          ellipsizeMode="tail"
          style={{ color: frame.ink, fontSize: CAPTION_FONT_SIZE, lineHeight: CAPTION_FONT_SIZE + 2 }}
        >
          {caption}
        </AppText>
        <AppText
          variant="hand"
          style={{ color: frame.inkSoft, fontSize: DATE_FONT_SIZE, lineHeight: DATE_FONT_SIZE + 2 }}
        >
          {dateLabel}
        </AppText>
      </View>
    </PressableScale>
  );
}

export const LibraryCell = memo(LibraryCellBase);

const styles = StyleSheet.create({
  frame: {
    paddingHorizontal: spacing.xs + spacing.xxs,
    paddingTop: spacing.xs + spacing.xxs,
    borderRadius: borderRadius.xs,
  },
  caption: {
    height: CAPTION_HEIGHT,
    justifyContent: 'center',
  },
});
