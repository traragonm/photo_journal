import { useEffect } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { AppText } from '@/components';
import { FRAME_TYPES, type FrameType } from '@/models';
import { borderRadius, colors, durations, easings, fontFamilies, fontSizes } from '@/theme';
import { cluster, FRAME_KNOB, polarBoxAround } from './dialGeometry';
import { KnurlRing } from './RadialMarks';

const KNOB_TIMING = { duration: durations.frameMorph, easing: Easing.bezier(...easings.dial) };
/** Knob knurl: 5° light / 5° dark (design). */
const KNOB_KNURL_DEGREES = 5;
const LABEL_LETTER_SPACING = 0.8;
/** Design: box-shadow 0 4px 10px rgba(0,0,0,0.6). */
const KNOB_SHADOW = {
  shadowColor: colors.black,
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.6,
  shadowRadius: 10,
  elevation: 6,
} as const;
const LABEL_HIT_SLOP = { top: 8, bottom: 8, left: 4, right: 4 };

export interface FrameKnobProps {
  scale: number;
  frameType: FrameType;
  onSelect: (frameType: FrameType) => void;
  onCycle: () => void;
}

/**
 * Knurled frame-type knob with MINI / SQ / WIDE around it (positions in cluster coordinates).
 * Tap a label to pick it, tap the knob to cycle; the indicator turns to −55° / 0° / 55°.
 */
export function FrameKnob({ scale, frameType, onSelect, onCycle }: FrameKnobProps) {
  const u = (value: number) => value * scale;
  const rotation = useSharedValue<number>(FRAME_KNOB[frameType].angle);

  useEffect(() => {
    rotation.set(withTiming(FRAME_KNOB[frameType].angle, KNOB_TIMING));
  }, [frameType, rotation]);

  const capStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${rotation.get()}deg` }] }));

  const { knob, knobCenter, knobLabelRadius, knobLabel, knobIndicator } = cluster;
  const knobSize = u(knob.size);
  const capSize = u(knob.capSize);
  const current = FRAME_KNOB[frameType];

  return (
    <>
      {FRAME_TYPES.map((type) => {
        const spec = FRAME_KNOB[type];
        const selected = type === frameType;
        const box = polarBoxAround(
          knobCenter.x,
          knobCenter.y,
          knobLabelRadius,
          spec.angle,
          knobLabel.width,
          knobLabel.height,
        );
        return (
          <Pressable
            key={type}
            onPress={() => onSelect(type)}
            hitSlop={LABEL_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel={`Khung ${spec.name}`}
            accessibilityState={{ selected }}
            style={[
              styles.label,
              { left: u(box.left), top: u(box.top), width: u(knobLabel.width), height: u(knobLabel.height) },
            ]}
          >
            <AppText
              style={{
                fontFamily: selected ? fontFamilies.bold : fontFamilies.medium,
                fontSize: u(fontSizes.micro),
                letterSpacing: LABEL_LETTER_SPACING,
                color: selected ? colors.onInk : colors.cameraLabelIdle,
              }}
            >
              {spec.short}
            </AppText>
          </Pressable>
        );
      })}

      <Pressable
        onPress={onCycle}
        accessibilityRole="button"
        accessibilityLabel={`Lẫy kiểu khung, đang chọn ${current.name}. Chạm để đổi`}
        style={[
          styles.knob,
          KNOB_SHADOW,
          { left: u(knob.left), top: u(knob.top), width: knobSize, height: knobSize },
        ]}
      >
        <KnurlRing
          diameter={knobSize}
          thickness={u(knob.ring)}
          segmentDegrees={KNOB_KNURL_DEGREES}
          light={colors.cameraKnurlLight}
          dark={colors.cameraKnurlDark}
        />
        <Animated.View
          style={[
            styles.cap,
            { left: u(knob.ring), top: u(knob.ring), width: capSize, height: capSize },
            capStyle,
          ]}
        >
          <View
            style={[
              styles.indicator,
              {
                left: u(knobIndicator.left),
                top: u(knobIndicator.top),
                width: u(knobIndicator.width),
                height: u(knobIndicator.height),
              },
            ]}
          />
        </Animated.View>
      </Pressable>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  knob: {
    position: 'absolute',
    borderRadius: borderRadius.pill,
    backgroundColor: colors.cameraKnurlDark,
  },
  cap: {
    position: 'absolute',
    borderRadius: borderRadius.pill,
    backgroundColor: colors.cameraKnob,
  },
  indicator: {
    position: 'absolute',
    borderRadius: borderRadius.xs,
    backgroundColor: colors.accent,
  },
});
