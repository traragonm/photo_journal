import { StyleSheet } from 'react-native';
import type { PhotoEntry } from '@/models';
import { formatClock, formatLongDate } from '@/utils/date';
import { rotationFor } from '@/utils/rotation';
import { useFrameStyle } from '@/viewmodels/shared';
import { AppText } from './AppText';
import { PhotoImage } from './PhotoImage';
import { PolaroidFrame } from './PolaroidFrame';
import { PressableScale } from './PressableScale';

export interface PolaroidCardProps {
  photo: PhotoEntry;
  width: number;
  onPress?: (photo: PhotoEntry) => void;
  /** "Giữ để viết ghi chú" */
  onLongPress?: (photo: PhotoEntry) => void;
  /** Override the deterministic tilt (e.g. 0 in the detail view). */
  rotation?: number;
  shadow?: 'soft' | 'print' | 'printLifted';
  /** Hide the caption/time strip text (tiny thumbnails). */
  bare?: boolean;
}

/** A captured moment as a tappable print: photo window + handwritten caption and time. */
export function PolaroidCard({
  photo,
  width,
  onPress,
  onLongPress,
  rotation,
  shadow = 'print',
  bare = false,
}: PolaroidCardProps) {
  const { frame, captionVariant } = useFrameStyle();
  const time = formatClock(photo.createdAt);
  const label = `Ảnh lúc ${time}, ${formatLongDate(photo.createdAt)}${photo.caption ? `: ${photo.caption}` : ''}`;
  return (
    <PressableScale
      onPress={onPress ? () => onPress(photo) : undefined}
      onLongPress={onLongPress ? () => onLongPress(photo) : undefined}
      disabled={!onPress && !onLongPress}
      accessibilityRole="imagebutton"
      accessibilityLabel={label}
      accessibilityHint={onLongPress ? 'Giữ để viết ghi chú' : undefined}
    >
      <PolaroidFrame
        width={width}
        frameType={photo.frameType}
        colorStyle={frame}
        rotation={rotation ?? rotationFor(photo.id)}
        shadow={shadow}
        image={
          <PhotoImage
            uri={photo.imageUri}
            isAvailable={photo.isImageAvailable}
            filter={photo.filter}
            style={StyleSheet.absoluteFill}
          />
        }
        footer={
          bare ? null : (
            <>
              {photo.caption ? (
                <AppText variant={captionVariant} numberOfLines={1} style={{ color: frame.ink }}>
                  {photo.caption}
                </AppText>
              ) : null}
              <AppText variant="handSmall" style={{ color: frame.inkSoft }}>
                {time}
              </AppText>
            </>
          )
        }
      />
    </PressableScale>
  );
}
