import { memo } from 'react';
import { StyleSheet, View } from 'react-native';
import { borderRadius } from '@/theme';
import { arcLength, knurlAngles, polarBox } from './dialGeometry';

export interface RadialMarkProps {
  /** Centre of the circle (the parent is a square of side 2 × center). */
  center: number;
  /** Distance from the centre to the middle of the mark. */
  radius: number;
  angle: number;
  width: number;
  length: number;
  color: string;
}

/** A short radial bar (tick / knurl segment), drawn as a rotated View. */
export function RadialMark({ center, radius, angle, width, length, color }: RadialMarkProps) {
  const { left, top } = polarBox(center, radius, angle, width, length);
  return (
    <View
      pointerEvents="none"
      style={[
        styles.mark,
        { left, top, width, height: length, backgroundColor: color, transform: [{ rotate: `${angle}deg` }] },
      ]}
    />
  );
}

export interface KnurlRingProps {
  diameter: number;
  /** Ring thickness (the knurled band at the edge). */
  thickness: number;
  /** Angular size of each light / dark segment (design: repeating-conic-gradient step). */
  segmentDegrees: number;
  light: string;
  dark: string;
}

/**
 * Knurled metal edge (design: `repeating-conic-gradient(light 0 Xdeg, dark Xdeg 2Xdeg)`),
 * approximated with a dark disc and a ring of small light segments. Content is drawn on top by the parent.
 */
export const KnurlRing = memo(function KnurlRing({ diameter, thickness, segmentDegrees, light, dark }: KnurlRingProps) {
  const center = diameter / 2;
  const radius = center - thickness / 2;
  const segmentWidth = arcLength(radius, segmentDegrees);
  return (
    <View
      pointerEvents="none"
      style={[styles.disc, { width: diameter, height: diameter, backgroundColor: dark }]}
    >
      {knurlAngles(segmentDegrees).map((angle) => (
        <RadialMark
          key={angle}
          center={center}
          radius={radius}
          angle={angle}
          width={segmentWidth}
          length={thickness}
          color={light}
        />
      ))}
    </View>
  );
});

const styles = StyleSheet.create({
  mark: {
    position: 'absolute',
  },
  disc: {
    position: 'absolute',
    left: 0,
    top: 0,
    borderRadius: borderRadius.pill,
    overflow: 'hidden',
  },
});
