import { useEffect } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppText, Button, PhotoImage, PolaroidFrame } from '@/components';
import { durations, inputReset, layout, spacing, springs, typography } from '@/theme';
import { formatClock } from '@/utils/date';
import { rotationFor } from '@/utils/rotation';
import { useFrameStyle } from '@/viewmodels/shared';
import type { DevelopingPrint as DevelopingPrintModel } from '@/viewmodels/useCameraViewModel';
import { cameraColors } from './cameraTokens';
import { fitPrint } from './cameraGeometry';

/** Print bounds relative to the pane. */
const PRINT_WIDTH_RATIO = 0.78;
const PRINT_HEIGHT_RATIO = 0.5;
const MAX_PRINT_WIDTH = 340;
/** The print is "ejected" from above. */
const DROP_DISTANCE = 360;
/** Extra tilt while dropping; settles onto the stable per-photo tilt. */
const DROP_EXTRA_TILT_DEG = 6;
/** Fraction of the develop time during which the dark emulsion clears. */
const FILM_CLEAR_END = 0.6;
/** Peak opacity of the milky wash mid-development. */
const WASH_PEAK_OPACITY = 0.75;
const WASH_PEAK_AT = 0.4;

export interface DevelopingPrintProps {
  print: DevelopingPrintModel;
  paneWidth: number;
  paneHeight: number;
  captionMaxLength: number;
  onChangeCaption: (text: string) => void;
  onDone: () => void;
  onDismiss: () => void;
}

/**
 * The just-captured print: drops in, then develops from dark film through a milky wash to
 * clear, while the user can write a caption on the bottom strip.
 */
export function DevelopingPrint({
  print,
  paneWidth,
  paneHeight,
  captionMaxLength,
  onChangeCaption,
  onDone,
  onDismiss,
}: DevelopingPrintProps) {
  const { frame, captionVariant } = useFrameStyle();
  const fitted = fitPrint(
    print.frameType,
    Math.min(MAX_PRINT_WIDTH, paneWidth * PRINT_WIDTH_RATIO),
    paneHeight * PRINT_HEIGHT_RATIO,
  );
  const tilt = rotationFor(print.id);

  const drop = useSharedValue(0);
  const develop = useSharedValue(0);

  useEffect(() => {
    drop.set(withSpring(1, springs.gentle));
    develop.set(
      withDelay(durations.fast, withTiming(1, { duration: durations.develop, easing: Easing.out(Easing.cubic) })),
    );
  }, [drop, develop]);

  const printStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: interpolate(drop.get(), [0, 1], [-DROP_DISTANCE, 0]) },
      { rotate: `${interpolate(drop.get(), [0, 1], [tilt + DROP_EXTRA_TILT_DEG, tilt])}deg` },
    ],
  }));
  // Dark emulsion clears first…
  const filmStyle = useAnimatedStyle(() => ({
    opacity: interpolate(develop.get(), [0, FILM_CLEAR_END], [1, 0], 'clamp'),
  }));
  // …then a milky wash fades as the colours come through.
  const washStyle = useAnimatedStyle(() => ({
    opacity: interpolate(develop.get(), [0, WASH_PEAK_AT, 1], [0, WASH_PEAK_OPACITY, 0], 'clamp'),
  }));
  const statusStyle = useAnimatedStyle(() => ({
    opacity: interpolate(develop.get(), [FILM_CLEAR_END, 1], [1, 0], 'clamp'),
  }));

  const imageUri = print.photo?.imageUri ?? print.previewUri;
  const hasCaption = print.caption.trim().length > 0;

  return (
    <Animated.View
      entering={FadeIn.duration(durations.fast)}
      exiting={FadeOut.duration(durations.normal)}
      style={[StyleSheet.absoluteFill, styles.scrim]}
      accessibilityViewIsModal
    >
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={Keyboard.dismiss}
        accessibilityElementsHidden
        importantForAccessibility="no"
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.center}
        pointerEvents="box-none"
      >
        <Animated.View style={printStyle}>
          <PolaroidFrame
            width={fitted.width}
            frameType={print.frameType}
            colorStyle={frame}
            shadow="printLifted"
            image={
              <View style={styles.imageArea}>
                <PhotoImage
                  key={imageUri}
                  uri={imageUri}
                  isAvailable={print.photo?.isImageAvailable ?? true}
                  filter={print.filter}
                  style={StyleSheet.absoluteFill}
                  accessibilityLabel="Ảnh vừa chụp đang hiện dần"
                />
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.wash, washStyle]} />
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.film, filmStyle]} />
              </View>
            }
            footer={
              <View style={styles.footer}>
                <TextInput
                  value={print.caption}
                  onChangeText={onChangeCaption}
                  maxLength={captionMaxLength}
                  placeholder="Viết vài chữ…"
                  placeholderTextColor={frame.inkSoft}
                  style={[typography[captionVariant], styles.caption, inputReset, { color: frame.ink }]}
                  returnKeyType="done"
                  onSubmitEditing={onDone}
                  submitBehavior="blurAndSubmit"
                  editable={!print.isSavingCaption}
                  accessibilityLabel="Ghi chú cho ảnh"
                  accessibilityHint={`Không bắt buộc, tối đa ${captionMaxLength} ký tự`}
                />
                <AppText variant="handSmall" style={[styles.time, { color: frame.inkSoft }]}>
                  {formatClock(print.createdAt)}
                </AppText>
              </View>
            }
          />
        </Animated.View>

        <Animated.View style={statusStyle} pointerEvents="none">
          <AppText variant="caption" color="onInkMuted">
            {print.photo ? 'Ảnh đang hiện dần…' : 'Đang cất vào nhật ký…'}
          </AppText>
        </Animated.View>

        <View style={styles.actions}>
          <Button
            label="Chụp tiếp"
            variant="secondary"
            icon="camera-outline"
            onPress={onDismiss}
            disabled={print.isSavingCaption}
            accessibilityHint="Đóng tấm ảnh; ảnh đã nằm trong nhật ký"
          />
          <Button
            label={hasCaption ? 'Lưu' : 'Xong'}
            variant="accent"
            icon="checkmark"
            onPress={onDone}
            loading={print.isSavingCaption}
            accessibilityHint={hasCaption ? 'Lưu ghi chú cho ảnh này' : 'Đóng tấm ảnh'}
          />
        </View>
      </KeyboardAvoidingView>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  scrim: {
    backgroundColor: cameraColors.developScrim,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    paddingHorizontal: layout.screenGutter,
  },
  imageArea: {
    flex: 1,
  },
  wash: {
    backgroundColor: cameraColors.developWash,
  },
  film: {
    backgroundColor: cameraColors.viewfinderEmpty,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  caption: {
    flex: 1,
    paddingVertical: spacing.none,
  },
  time: {
    flexShrink: 0,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
});
