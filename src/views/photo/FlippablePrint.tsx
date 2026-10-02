import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText, PhotoImage, PolaroidFrame, PressableScale, printGeometry } from '@/components';
import { hasLocation, type PhotoEntry } from '@/models';
import { borderRadius, colors, durations, shadows, spacing, type FrameColorStyle } from '@/theme';
import { formatClock, formatFilmStamp, formatLongDate } from '@/utils/date';
import { formatPlace } from '@/utils/geo';
import { PRINT_TILT } from './detailConstants';

export interface FlippablePrintProps {
  photo: PhotoEntry;
  width: number;
  frame: FrameColorStyle;
  flipped: boolean;
  onOpenViewer: () => void;
  onEdit: () => void;
}

const PERSPECTIVE = 1200;
const HALF_TURN = 180;
const STAMP_FONT_SIZE = 20;
const STAMP_INSET_X = 10;
const STAMP_INSET_Y = 4;
const STAMP_SPACING = 0.9;
const STAMP_GLOW_RADIUS = 6;
const BACK_PADDING = 28;

/** "Title" is the caption's first line; the rest is the note. */
function splitCaption(caption: string | null): { title: string | null; note: string | null } {
  if (!caption) return { title: null, note: null };
  const [first, ...rest] = caption.split('\n');
  const note = rest.join('\n').trim();
  return { title: first.trim() || null, note: note || null };
}

/** The big print. Flips (rotateY) to a plain paper back with the caption, date and place. */
export function FlippablePrint({ photo, width, frame, flipped, onOpenViewer, onEdit }: FlippablePrintProps) {
  const geometry = printGeometry(width, photo.frameType);
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.set(withTiming(flipped ? 1 : 0, { duration: durations.slow }));
  }, [flipped, progress]);

  const frontStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${progress.get() * HALF_TURN}deg` }],
  }));
  const backStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: PERSPECTIVE }, { rotateY: `${progress.get() * HALF_TURN - HALF_TURN}deg` }],
  }));

  const { title, note } = splitCaption(photo.caption);
  const clock = formatClock(photo.createdAt);
  const place = hasLocation(photo) ? formatPlace(photo.locationName, photo.latitude, photo.longitude) : null;

  return (
    <View style={{ width, height: geometry.height, transform: [{ rotate: `${PRINT_TILT}deg` }] }}>
      <Animated.View
        style={[styles.face, frontStyle]}
        pointerEvents={flipped ? 'none' : 'auto'}
        importantForAccessibility={flipped ? 'no-hide-descendants' : 'auto'}
        accessibilityElementsHidden={flipped}
      >
        <PolaroidFrame
          width={width}
          frameType={photo.frameType}
          colorStyle={frame}
          shadow="printLifted"
          image={
            <PressableScale
              onPress={onOpenViewer}
              onLongPress={onEdit}
              accessibilityRole="imagebutton"
              accessibilityLabel="Ảnh. Chạm để xem toàn màn hình, giữ để sửa ghi chú"
              style={styles.fill}
            >
              <PhotoImage uri={photo.imageUri} isAvailable={photo.isImageAvailable} filter={photo.filter} style={styles.fill} />
              <AppText variant="lcd" style={styles.stamp} importantForAccessibility="no">
                {formatFilmStamp(photo.createdAt)}
              </AppText>
            </PressableScale>
          }
          footer={
            <View style={styles.caption}>
              <AppText variant="handTitle" numberOfLines={1} style={{ color: frame.ink }}>
                {title ?? clock}
              </AppText>
              {note ? (
                <AppText variant="handNote" numberOfLines={2} style={{ color: frame.inkSoft }}>
                  {note}
                </AppText>
              ) : null}
            </View>
          }
        />
      </Animated.View>

      <Animated.View
        style={[styles.face, styles.back, shadows.printLifted, backStyle]}
        pointerEvents={flipped ? 'auto' : 'none'}
        importantForAccessibility={flipped ? 'auto' : 'no-hide-descendants'}
        accessibilityElementsHidden={!flipped}
      >
        <AppText variant="handTitle" style={styles.backInk}>
          {photo.caption ?? 'Chưa có ghi chú'}
        </AppText>
        <View style={styles.backMeta}>
          <AppText variant="handNote" color="textMuted">
            {`${formatLongDate(photo.createdAt)} · ${clock}`}
          </AppText>
          {place ? (
            <AppText variant="handNote" color="textMuted">
              {place}
            </AppText>
          ) : null}
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  face: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backfaceVisibility: 'hidden' },
  fill: { flex: 1 },
  stamp: {
    position: 'absolute',
    right: STAMP_INSET_X,
    bottom: STAMP_INSET_Y,
    fontSize: STAMP_FONT_SIZE,
    letterSpacing: STAMP_SPACING,
    color: colors.filmStamp,
    textShadowColor: colors.filmStampGlow,
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: STAMP_GLOW_RADIUS,
  },
  caption: { gap: spacing.xs, paddingHorizontal: spacing.xs },
  back: {
    backgroundColor: colors.sheet,
    borderRadius: borderRadius.print,
    padding: BACK_PADDING,
    justifyContent: 'space-between',
  },
  backInk: { color: colors.frameInk },
  backMeta: { gap: spacing.xs },
});
