import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { AppText, PressableScale } from '@/components';
import { FILM_FILTERS } from '@/models';
import { borderRadius, colors, durations, easings, filmFilters, fontFamilies, pressFeedback } from '@/theme';
import { cameraColors } from './cameraTokens';
import {
  ZOOM_STOPS,
  angleOfPoint,
  clampZoomRotation,
  dial,
  filterAngle,
  filterRingRotation,
  innerTickAngles,
  nearestEquivalentAngle,
  outerTicks,
  polarBox,
  ringAt,
  snapFilter,
  snapZoomIndex,
  wrapDelta,
  zoomRingRotation,
} from './dialGeometry';
import { KnurlRing, RadialMark } from './RadialMarks';

const DIAL_TIMING = { duration: durations.dial, easing: Easing.bezier(...easings.dial) };
const OUTER_TICKS = outerTicks();
const INNER_TICKS = innerTickAngles();
/** Outer knurl: 3° light / 3° dark (design). */
const OUTER_KNURL_DEGREES = 3;
const ZOOM_LABEL_FONT_SIZE = 14;
/** Selected swatch: 2px dial-face gap + 2px cream ring (design box-shadow). */
const SWATCH_RING = 2;
const SWATCH_OUTLINE = 1;
/** Square "stop" mark on the shutter while the self-timer runs (fraction of the core). */
const STOP_MARK_RATIO = 0.36;
const DISABLED_OPACITY = 0.5;
/** Drag must travel this far before the ring turns (taps still select labels). */
const DRAG_MIN_DISTANCE = 6;

const RING_NONE = 0;
const RING_OUTER = 1;
const RING_INNER = 2;

export interface CameraDialProps {
  scale: number;
  zoomIndex: number;
  filterIndex: number;
  onSelectZoom: (index: number) => void;
  onSelectFilter: (index: number) => void;
  onShutter: () => void;
  /** Self-timer is counting: the shutter cancels it. */
  isCountingDown: boolean;
  shutterDisabled: boolean;
}

/**
 * The big dial: cream outer ring with zoom stops, dark inner ring with film swatches,
 * shutter in the middle. Rings rotate to bring the choice under their pointer; both can
 * also be turned by dragging (snaps to the nearest stop).
 */
export function CameraDial({
  scale,
  zoomIndex,
  filterIndex,
  onSelectZoom,
  onSelectFilter,
  onShutter,
  isCountingDown,
  shutterDisabled,
}: CameraDialProps) {
  const u = (value: number) => value * scale;
  const size = u(dial.size);
  const center = size / 2;

  const outerRotation = useSharedValue(zoomRingRotation(zoomIndex));
  const innerRotation = useSharedValue(filterRingRotation(filterIndex));
  const dragRing = useSharedValue(RING_NONE);
  const lastAngle = useSharedValue(0);

  useEffect(() => {
    outerRotation.set(withTiming(zoomRingRotation(zoomIndex), DIAL_TIMING));
  }, [zoomIndex, outerRotation]);

  useEffect(() => {
    // Shortest spin: going from the last swatch to the first turns 60°, not 300°.
    const target = nearestEquivalentAngle(innerRotation.get(), filterRingRotation(filterIndex));
    innerRotation.set(withTiming(target, DIAL_TIMING));
  }, [filterIndex, innerRotation]);

  const pan = Gesture.Pan()
    .minDistance(DRAG_MIN_DISTANCE)
    .onBegin((event) => {
      const distance = Math.hypot(event.x - center, event.y - center) / scale;
      const ring = ringAt(distance);
      dragRing.set(ring === 'outer' ? RING_OUTER : ring === 'inner' ? RING_INNER : RING_NONE);
      lastAngle.set(angleOfPoint(event.x, event.y, center, center));
    })
    .onUpdate((event) => {
      const ring = dragRing.get();
      if (ring === RING_NONE) return;
      const angle = angleOfPoint(event.x, event.y, center, center);
      const delta = wrapDelta(angle - lastAngle.get());
      lastAngle.set(angle);
      if (ring === RING_OUTER) outerRotation.set(clampZoomRotation(outerRotation.get() + delta));
      else innerRotation.set(innerRotation.get() + delta);
    })
    .onEnd(() => {
      const ring = dragRing.get();
      if (ring === RING_OUTER) {
        const index = snapZoomIndex(outerRotation.get());
        outerRotation.set(withTiming(zoomRingRotation(index), DIAL_TIMING));
        scheduleOnRN(onSelectZoom, index);
      } else if (ring === RING_INNER) {
        const snap = snapFilter(innerRotation.get());
        innerRotation.set(withTiming(snap.rotation, DIAL_TIMING));
        scheduleOnRN(onSelectFilter, snap.index);
      }
    })
    .onFinalize(() => {
      dragRing.set(RING_NONE);
    });

  const outerStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${outerRotation.get()}deg` }] }));
  const innerStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${innerRotation.get()}deg` }] }));

  const innerSize = u(dial.inner.size);
  const innerCenter = innerSize / 2;
  const brassSize = innerSize + 2 * u(dial.inner.brass);
  const shutterSize = u(dial.shutter.size);
  const knurl = u(dial.knurlWidth);

  return (
    <GestureDetector gesture={pan}>
      <View style={{ width: size, height: size }}>
        {/* Outer cream ring: knurled edge, ticks, zoom stops */}
        <Animated.View style={[styles.layer, { width: size, height: size }, outerStyle]}>
          <KnurlRing
            diameter={size}
            thickness={knurl}
            segmentDegrees={OUTER_KNURL_DEGREES}
            light={colors.cameraKnurlLight}
            dark={colors.cameraKnurlDark}
          />
          <View
            pointerEvents="none"
            style={[
              styles.round,
              styles.cream,
              { left: knurl, top: knurl, width: size - 2 * knurl, height: size - 2 * knurl },
            ]}
          />
          {OUTER_TICKS.map(({ angle, major }) => {
            const inner = major ? dial.outerTickMajorInner : dial.outerTickMinorInner;
            return (
              <RadialMark
                key={angle}
                center={center}
                radius={u((dial.outerTickOuter + inner) / 2)}
                angle={angle}
                width={u(dial.tickWidth)}
                length={u(dial.outerTickOuter - inner)}
                color={colors.cameraTick}
              />
            );
          })}
          {ZOOM_STOPS.map((spec, index) => {
            const selected = index === zoomIndex;
            const box = polarBox(dial.center, dial.zoomLabelRadius, spec.angle, dial.zoomLabel.width, dial.zoomLabel.height);
            return (
              <Pressable
                key={spec.stop}
                onPress={() => onSelectZoom(index)}
                accessibilityRole="button"
                accessibilityLabel={`Zoom ${spec.dialLabel}`}
                accessibilityState={{ selected }}
                style={[
                  styles.center,
                  {
                    left: u(box.left),
                    top: u(box.top),
                    width: u(dial.zoomLabel.width),
                    height: u(dial.zoomLabel.height),
                    transform: [{ rotate: `${spec.angle}deg` }],
                  },
                ]}
              >
                <AppText
                  style={[
                    styles.zoomLabel,
                    { fontSize: u(ZOOM_LABEL_FONT_SIZE), color: selected ? colors.accentText : colors.ink },
                  ]}
                >
                  {spec.dialLabel}
                </AppText>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Brass rim + inner dark ring with film swatches */}
        <View
          pointerEvents="none"
          style={[
            styles.round,
            styles.brass,
            {
              left: u(dial.inner.offset - dial.inner.brass),
              top: u(dial.inner.offset - dial.inner.brass),
              width: brassSize,
              height: brassSize,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.round,
            styles.dialFace,
            { left: u(dial.inner.offset), top: u(dial.inner.offset), width: innerSize, height: innerSize },
            innerStyle,
          ]}
        >
          {INNER_TICKS.map((angle) => (
            <RadialMark
              key={angle}
              center={innerCenter}
              radius={u((dial.innerTickOuter + dial.innerTickInner) / 2)}
              angle={angle}
              width={u(dial.tickWidth)}
              length={u(dial.innerTickOuter - dial.innerTickInner)}
              color={colors.cameraTickDark}
            />
          ))}
          {FILM_FILTERS.map((filter, index) => {
            const look = filmFilters[filter];
            const selected = index === filterIndex;
            const box = polarBox(dial.inner.size / 2, dial.swatchRadius, filterAngle(index), dial.swatchHit, dial.swatchHit);
            const swatch = u(dial.swatchSize);
            const ringSize = swatch + 4 * u(SWATCH_RING);
            return (
              <Pressable
                key={filter}
                onPress={() => onSelectFilter(index)}
                accessibilityRole="button"
                accessibilityLabel={`Bộ lọc ${look.label}`}
                accessibilityState={{ selected }}
                style={[
                  styles.center,
                  { left: u(box.left), top: u(box.top), width: u(dial.swatchHit), height: u(dial.swatchHit) },
                ]}
              >
                <View
                  style={[
                    styles.round,
                    styles.swatchRing,
                    {
                      width: ringSize,
                      height: ringSize,
                      borderWidth: selected ? u(SWATCH_RING) : 0,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.round,
                      styles.swatch,
                      {
                        width: swatch,
                        height: swatch,
                        borderWidth: selected ? 0 : SWATCH_OUTLINE,
                      },
                    ]}
                  >
                    {look.swatch.map((color, half) => (
                      <View key={half} style={[styles.swatchPart, { backgroundColor: color }]} />
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </Animated.View>

        {/* Pointers: accent (zoom) above the dial, cream (filter) above the inner ring */}
        <Triangle
          left={u(dial.size / 2 - dial.innerPointer.halfWidth)}
          top={u(dial.innerPointer.top)}
          halfWidth={u(dial.innerPointer.halfWidth)}
          height={u(dial.innerPointer.height)}
          color={colors.onInk}
        />

        {/* Shutter */}
        <PressableScale
          onPress={onShutter}
          disabled={shutterDisabled && !isCountingDown}
          pressedScale={pressFeedback.shutterScale}
          accessibilityRole="button"
          accessibilityLabel={isCountingDown ? 'Huỷ hẹn giờ' : 'Chụp ảnh'}
          accessibilityState={{ disabled: shutterDisabled && !isCountingDown }}
          style={[
            styles.round,
            styles.shutter,
            {
              left: u(dial.shutter.offset),
              top: u(dial.shutter.offset),
              width: shutterSize,
              height: shutterSize,
              borderWidth: u(dial.shutter.ring),
              padding: u(dial.shutter.gap),
            },
            shutterDisabled && !isCountingDown ? styles.disabled : null,
          ]}
        >
          <View style={[styles.round, styles.shutterCore]}>
            {isCountingDown ? (
              <View
                style={[
                  styles.stopMark,
                  { width: shutterSize * STOP_MARK_RATIO, height: shutterSize * STOP_MARK_RATIO },
                ]}
              />
            ) : null}
          </View>
        </PressableScale>
      </View>
    </GestureDetector>
  );
}

/** Downward-pointing triangle (CSS border trick, as in the design). */
export function Triangle({
  left,
  top,
  halfWidth,
  height,
  color,
}: {
  left: number;
  top: number;
  halfWidth: number;
  height: number;
  color: string;
}) {
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.triangle,
        {
          left,
          top,
          borderLeftWidth: halfWidth,
          borderRightWidth: halfWidth,
          borderTopWidth: height,
          borderTopColor: color,
        },
      ]}
    />
  );
}

const styles = StyleSheet.create({
  layer: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  round: {
    position: 'absolute',
    borderRadius: borderRadius.pill,
  },
  cream: {
    backgroundColor: colors.cameraDialCream,
  },
  brass: {
    backgroundColor: colors.cameraBrass,
  },
  dialFace: {
    backgroundColor: colors.cameraDialFace,
  },
  center: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomLabel: {
    fontFamily: fontFamilies.bold,
  },
  swatchRing: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
    borderColor: colors.onInk,
  },
  swatch: {
    position: 'relative',
    flexDirection: 'row',
    overflow: 'hidden',
    borderColor: cameraColors.swatchOutline,
  },
  swatchPart: {
    flex: 1,
  },
  shutter: {
    borderColor: colors.onInk,
    backgroundColor: colors.transparent,
  },
  shutterCore: {
    position: 'relative',
    flex: 1,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stopMark: {
    backgroundColor: colors.onInk,
    borderRadius: borderRadius.xs,
  },
  disabled: {
    opacity: DISABLED_OPACITY,
  },
  triangle: {
    position: 'absolute',
    width: 0,
    height: 0,
    borderLeftColor: colors.transparent,
    borderRightColor: colors.transparent,
  },
});
