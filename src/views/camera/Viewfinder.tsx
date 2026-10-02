import { useEffect, type ReactNode } from 'react';
import { Platform, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { AppText } from '@/components';
import type { FilmFilter, FrameType } from '@/models';
import { borderRadius, colors, durations, filmFilters, fontFamilies, shadows, typography } from '@/theme';
import { cameraColors } from './cameraTokens';
import { fitPrint, previewCoverBox } from './dialGeometry';

/** CSS `ease` — the design's `transition: width 0.35s ease`. */
const MORPH_TIMING = { duration: durations.frameMorph, easing: Easing.bezier(0.25, 0.1, 0.25, 1) };
const BRACKET_SIZE = 22;
const BRACKET_INSET = 12;
const BRACKET_STROKE = 2;
const BADGE_BOTTOM = 12;
const BADGE_PADDING_V = 3;
const BADGE_PADDING_H = 10;
const FOOTER_FONT_SIZE = 20;
const FOOTER_PADDING = 4;
const FOOTER_LINE_HEIGHT = 1.2;
const COUNTDOWN_FONT_SIZE = 120;
const COUNTDOWN_SHADOW_RADIUS = 12;
/** The print's corner radius in the design (4px). */
const VIEWFINDER_RADIUS = 4;
/** iOS supports only part of the CSS `filter` style; the colour wash carries the look there. */
const SUPPORTS_FILTER_STYLE = Platform.OS !== 'ios';

export interface ViewfinderProps {
  scale: number;
  maxWidth: number;
  maxHeight: number;
  frameType: FrameType;
  filter: FilmFilter;
  zoomLabel: string;
  /** Seconds left on the self-timer (shown big over the preview). */
  countdown: number | null;
  /** Status text while the preview is not live ("Đang mở camera…"). */
  status: string | null;
  /** The live CameraView (fills its box; the window crops it). */
  camera: ReactNode;
}

/**
 * The live camera inside a print whose proportions follow the frame knob. The print morphs
 * between formats; the preview keeps a fixed size that covers every window, so the window
 * only reveals a different centred crop.
 */
export function Viewfinder({
  scale,
  maxWidth,
  maxHeight,
  frameType,
  filter,
  zoomLabel,
  countdown,
  status,
  camera,
}: ViewfinderProps) {
  const u = (value: number) => value * scale;
  const target = fitPrint(frameType, maxWidth, maxHeight);
  const cover = previewCoverBox(maxWidth, maxHeight);
  const look = filmFilters[filter];

  const printWidth = useSharedValue(target.width);
  const printHeight = useSharedValue(target.height);
  const pad = useSharedValue(target.pad);
  const windowWidth = useSharedValue(target.imageWidth);
  const windowHeight = useSharedValue(target.imageHeight);

  useEffect(() => {
    printWidth.set(withTiming(target.width, MORPH_TIMING));
    printHeight.set(withTiming(target.height, MORPH_TIMING));
    pad.set(withTiming(target.pad, MORPH_TIMING));
    windowWidth.set(withTiming(target.imageWidth, MORPH_TIMING));
    windowHeight.set(withTiming(target.imageHeight, MORPH_TIMING));
  }, [
    target.width,
    target.height,
    target.pad,
    target.imageWidth,
    target.imageHeight,
    printWidth,
    printHeight,
    pad,
    windowWidth,
    windowHeight,
  ]);

  const printStyle = useAnimatedStyle(() => ({
    width: printWidth.get(),
    height: printHeight.get(),
    paddingTop: pad.get(),
    paddingHorizontal: pad.get(),
  }));
  const windowStyle = useAnimatedStyle(() => ({ width: windowWidth.get(), height: windowHeight.get() }));
  const previewStyle = useAnimatedStyle(() => ({
    left: (windowWidth.get() - cover.width) / 2,
    top: (windowHeight.get() - cover.height) / 2,
  }));

  const bracket = u(BRACKET_SIZE);
  const inset = u(BRACKET_INSET);

  return (
    <Animated.View style={[styles.print, shadows.viewfinder, printStyle]}>
      <Animated.View style={[styles.window, windowStyle]}>
        <Animated.View
          style={[
            styles.preview,
            { width: cover.width, height: cover.height },
            SUPPORTS_FILTER_STYLE && look.filter ? { filter: look.filter } : null,
            previewStyle,
          ]}
        >
          {camera}
        </Animated.View>
        {look.tint ? (
          <View
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, { backgroundColor: look.tint.color, opacity: look.tint.opacity }]}
          />
        ) : null}

        {status ? (
          <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.centered]}>
            <AppText variant="caption" color="onInkMuted">
              {status}
            </AppText>
          </View>
        ) : null}

        <Bracket corner="topLeft" size={bracket} inset={inset} />
        <Bracket corner="topRight" size={bracket} inset={inset} />
        <Bracket corner="bottomLeft" size={bracket} inset={inset} />
        <Bracket corner="bottomRight" size={bracket} inset={inset} />

        <View pointerEvents="none" style={[styles.badgeRow, { bottom: inset }]}>
          <View style={styles.badge}>
            <AppText style={styles.badgeText}>{`${zoomLabel} · ${look.label}`}</AppText>
          </View>
        </View>

        {countdown !== null ? (
          <Animated.View
            key={countdown}
            entering={ZoomIn.duration(durations.fast)}
            pointerEvents="none"
            style={[StyleSheet.absoluteFill, styles.centered]}
            accessibilityLiveRegion="assertive"
          >
            <AppText style={[styles.countdown, { fontSize: u(COUNTDOWN_FONT_SIZE), lineHeight: u(COUNTDOWN_FONT_SIZE) }]}>
              {String(countdown)}
            </AppText>
          </Animated.View>
        ) : null}
      </Animated.View>

      <View style={styles.footer}>
        <AppText
          numberOfLines={1}
          style={[styles.footerText, { fontSize: u(FOOTER_FONT_SIZE), lineHeight: u(FOOTER_FONT_SIZE) * FOOTER_LINE_HEIGHT }]}
        >
          Viết vài chữ sau khi chụp…
        </AppText>
      </View>
    </Animated.View>
  );
}

type Corner = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

function Bracket({ corner, size, inset }: { corner: Corner; size: number; inset: number }) {
  const isTop = corner === 'topLeft' || corner === 'topRight';
  const isLeft = corner === 'topLeft' || corner === 'bottomLeft';
  const vertical: ViewStyle = isTop
    ? { top: inset, borderTopWidth: BRACKET_STROKE }
    : { bottom: inset, borderBottomWidth: BRACKET_STROKE };
  const horizontal: ViewStyle = isLeft
    ? { left: inset, borderLeftWidth: BRACKET_STROKE }
    : { right: inset, borderRightWidth: BRACKET_STROKE };
  return <View pointerEvents="none" style={[styles.bracket, { width: size, height: size }, vertical, horizontal]} />;
}

const styles = StyleSheet.create({
  print: {
    borderRadius: VIEWFINDER_RADIUS,
    backgroundColor: cameraColors.viewfinderFill,
  },
  window: {
    overflow: 'hidden',
    backgroundColor: cameraColors.viewfinderEmpty,
  },
  preview: {
    position: 'absolute',
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  bracket: {
    position: 'absolute',
    borderColor: cameraColors.bracket,
  },
  badgeRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: BADGE_BOTTOM,
    alignItems: 'center',
  },
  badge: {
    paddingVertical: BADGE_PADDING_V,
    paddingHorizontal: BADGE_PADDING_H,
    borderRadius: borderRadius.pill,
    backgroundColor: colors.cameraBadge,
  },
  badgeText: {
    ...typography.caption,
    fontFamily: fontFamilies.semibold,
    color: cameraColors.badgeText,
  },
  countdown: {
    fontFamily: fontFamilies.bold,
    color: cameraColors.countdownText,
    textShadowColor: cameraColors.countdownShadow,
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: COUNTDOWN_SHADOW_RADIUS,
  },
  footer: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: FOOTER_PADDING,
  },
  footerText: {
    fontFamily: fontFamilies.hand,
    color: cameraColors.viewfinderHint,
  },
});
