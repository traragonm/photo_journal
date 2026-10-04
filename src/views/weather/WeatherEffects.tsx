import { memo, useEffect, useMemo } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useFrameCallback,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Sky } from '@/models';
import { colors } from '@/theme';

/**
 * Animated weather drawn over a page (ported from the design's canvas effects): a smiling sun,
 * drifting outlined clouds, teardrop rain with splashes, a storm with leaves and lightning, snow.
 * Everything is a function of one frame clock, so particles cost no JS work per frame.
 * The `back` layer (sun, clouds) sits behind the page's content, the `front` layer over it.
 */

/** The design's animation ran per 60 Hz frame. */
const FRAME_MS = 1000 / 60;
const DESIGN_W = 390;
const DESIGN_H = 844;
/** Fewer particles on web, where Reanimated animates on the JS thread. */
const DENSITY = Platform.OS === 'web' ? 0.5 : 1;
const SPLASH_FRAMES = 17;
const LIGHTNING_PERIOD_MS = 6000;
const LEAF_COLORS = [colors.fxLeafGreen, colors.fxLeafOrange, colors.fxLeafRust, colors.fxLeafLime, colors.fxLeafGold];

// ─── Scene ──────────────────────────────────────────────────────────────────────

interface CloudSpec {
  x0: number;
  y: number;
  s: number;
  sp: number;
  ph: number;
}
interface DropSpec {
  r: number;
  s: number;
  ground: number;
  start: number;
  offset: number;
}
interface LeafSpec {
  x0: number;
  y0: number;
  sz: number;
  vx: number;
  vy: number;
  rot: number;
  vr: number;
  ph: number;
  color: string;
}
interface FlakeSpec {
  x0: number;
  y0: number;
  r: number;
  s: number;
  ph: number;
  rot: number;
  vr: number;
  puff: boolean;
}
interface SparkSpec {
  x: number;
  y: number;
  s: number;
  ph: number;
  sp: number;
}

interface Scene {
  clouds: CloudSpec[];
  drops: DropSpec[];
  leaves: LeafSpec[];
  flakes: FlakeSpec[];
  sparks: SparkSpec[];
}

/** Small seeded PRNG so a sky always lays out the same way (no reshuffle on re-render). */
function seeded(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKY_SEEDS: Record<Sky, number> = { sun: 11, cloud: 23, rain: 37, snow: 41, storm: 53 };

function buildScene(sky: Sky, width: number, height: number): Scene {
  const R = seeded(SKY_SEEDS[sky]);
  const sx = width / DESIGN_W;
  const sy = height / DESIGN_H;
  const scene: Scene = { clouds: [], drops: [], leaves: [], flakes: [], sparks: [] };
  const clouds = (n: number, y1: number, y2: number, s1: number, s2: number) => {
    for (let i = 0; i < n; i++) {
      scene.clouds.push({
        x0: -60 + R() * (width + 80),
        y: (y1 + R() * (y2 - y1)) * sy,
        s: s1 + R() * (s2 - s1),
        sp: 0.12 + R() * 0.18,
        ph: R() * Math.PI * 2,
      });
    }
  };
  if (sky === 'sun') {
    clouds(2, 200, 360, 18, 26);
    for (let i = 0; i < 9; i++) {
      scene.sparks.push({
        x: (20 + R() * (DESIGN_W - 40)) * sx,
        y: (150 + R() * 560) * sy,
        s: 4 + R() * 5,
        ph: R() * Math.PI * 2,
        sp: 0.002 + R() * 0.002,
      });
    }
  } else if (sky === 'cloud') {
    clouds(5, 40, 340, 24, 46);
    scene.clouds.sort((a, b) => a.s - b.s);
  } else if (sky === 'rain' || sky === 'storm') {
    clouds(sky === 'storm' ? 3 : 2, 20, 110, 34, 48);
    const count = Math.round((sky === 'storm' ? 95 : 60) * DENSITY);
    for (let i = 0; i < count; i++) {
      scene.drops.push({
        r: 2.6 + R() * 2.2,
        s: (sky === 'storm' ? 10 : 6) + R() * 5,
        ground: height - 30 - R() * 260 * sy,
        start: -20 - R() * 60,
        offset: R() * 1000,
      });
    }
    if (sky === 'storm') {
      for (let i = 0; i < 10; i++) {
        scene.leaves.push({
          x0: R() * width,
          y0: R() * height * 0.85,
          sz: 10 + R() * 7,
          vx: 4 + R() * 5,
          vy: 0.4 + R() * 1.2,
          rot: R() * Math.PI * 2,
          vr: (R() - 0.5) * 0.22,
          ph: R() * Math.PI * 2,
          color: LEAF_COLORS[i % LEAF_COLORS.length],
        });
      }
    }
  } else {
    clouds(2, 20, 100, 30, 42);
    const count = Math.round(42 * DENSITY);
    for (let i = 0; i < count; i++) {
      scene.flakes.push({
        x0: R() * width,
        y0: R() * height,
        r: 5 + R() * 6,
        s: 0.6 + R(),
        ph: R() * Math.PI * 2,
        rot: R() * Math.PI * 2,
        vr: (R() - 0.5) * 0.03,
        puff: R() < 0.35,
      });
    }
  }
  return scene;
}

/** Deterministic noise in [0, 1) for particle `a` in cycle `b`. */
function hash(a: number, b: number): number {
  'worklet';
  const v = Math.sin(a * 12.9898 + b * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

function wrap(value: number, span: number): number {
  'worklet';
  return ((value % span) + span) % span;
}

// ─── Component ──────────────────────────────────────────────────────────────────

export interface WeatherEffectsProps {
  sky: Sky | null;
  layer: 'back' | 'front';
  width: number;
  height: number;
  /** Pause while the page is off screen (e.g. a pane that is not showing). */
  active?: boolean;
  /** Dark page (the diary during a storm): darker outlines. */
  dark?: boolean;
}

export function WeatherEffects({ sky, layer, width, height, active = true, dark = false }: WeatherEffectsProps) {
  const reducedMotion = useReducedMotion();
  const time = useSharedValue(0);
  const clock = useFrameCallback((frame) => {
    time.set(frame.timeSinceFirstFrame);
  }, false);
  const running = active && sky !== null && width > 0 && !reducedMotion;
  useEffect(() => {
    clock.setActive(running);
  }, [clock, running]);

  const scene = useMemo(() => (sky && width > 0 ? buildScene(sky, width, height) : null), [sky, width, height]);
  if (!sky || !scene || reducedMotion) return null;

  const ink = dark ? colors.fxInkDark : colors.fxInk;
  return (
    <View
      pointerEvents="none"
      importantForAccessibility="no-hide-descendants"
      accessibilityElementsHidden
      style={[StyleSheet.absoluteFill, styles.layer, layer === 'front' && styles.front]}
    >
      {layer === 'back' ? (
        <BackLayer sky={sky} scene={scene} time={time} width={width} ink={ink} />
      ) : (
        <FrontLayer sky={sky} scene={scene} time={time} width={width} height={height} ink={ink} dark={dark} />
      )}
    </View>
  );
}

interface LayerProps {
  sky: Sky;
  scene: Scene;
  time: SharedValue<number>;
  width: number;
  ink: string;
}

const CLOUD_COLORS: Record<Sky, { fill: string; shade: string }> = {
  sun: { fill: colors.fxCloud, shade: colors.fxCloudShadeSun },
  cloud: { fill: colors.fxCloud, shade: colors.fxCloudShadeCloud },
  rain: { fill: colors.fxRainCloud, shade: colors.fxRainCloudShade },
  storm: { fill: colors.fxStormCloud, shade: colors.fxStormCloudShade },
  snow: { fill: colors.fxCloud, shade: colors.fxSnowCloudShade },
};

function BackLayer({ sky, scene, time, width, ink }: LayerProps) {
  const cloud = CLOUD_COLORS[sky];
  return (
    <>
      {sky === 'sun' ? <Sun x={width - 70} y={92} r={32} time={time} ink={ink} halo /> : null}
      {sky === 'cloud' ? <Sun x={width - 92} y={84} r={24} time={time} ink={ink} /> : null}
      {scene.sparks.map((spark, i) => (
        <Sparkle key={i} spark={spark} time={time} />
      ))}
      {scene.clouds.map((spec, i) => (
        <Cloud key={i} spec={spec} time={time} width={width} fill={cloud.fill} shade={cloud.shade} ink={ink} />
      ))}
    </>
  );
}

function FrontLayer({ sky, scene, time, width, height, ink, dark }: LayerProps & { height: number; dark: boolean }) {
  const wind = sky === 'storm' ? 2.6 : 0.8;
  return (
    <>
      {scene.drops.map((drop, i) => (
        <Drop key={i} index={i} drop={drop} time={time} width={width} wind={wind} ink={ink} dark={dark} />
      ))}
      {scene.leaves.map((leaf, i) => (
        <Leaf key={i} leaf={leaf} time={time} width={width} height={height} ink={ink} />
      ))}
      {scene.flakes.map((flake, i) => (
        <Flake key={i} flake={flake} time={time} height={height} ink={ink} />
      ))}
      {sky === 'storm' ? <Lightning time={time} width={width} ink={ink} /> : null}
    </>
  );
}

// ─── Sun ────────────────────────────────────────────────────────────────────────

const SUN_RAYS = 12;

const Sun = memo(function Sun({
  x,
  y,
  r,
  time,
  ink,
  halo = false,
}: {
  x: number;
  y: number;
  r: number;
  time: SharedValue<number>;
  ink: string;
  halo?: boolean;
}) {
  const raysStyle = useAnimatedStyle(() => ({ transform: [{ rotate: `${time.get() * 0.0004}rad` }] }));
  const pulseStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + Math.sin(time.get() * 0.002) * 0.04 }] }));
  const circle = (radius: number) => ({
    left: x - radius,
    top: y - radius,
    width: radius * 2,
    height: radius * 2,
    borderRadius: radius,
  });
  return (
    <>
      {halo ? (
        <>
          {[150, 115, 80].map((radius) => (
            <View key={radius} style={[styles.abs, circle(radius), { backgroundColor: colors.fxHalo }]} />
          ))}
          <View style={[styles.abs, circle(92), styles.sunRing]} />
        </>
      ) : null}
      <Animated.View style={[styles.abs, { left: x, top: y }, raysStyle]}>
        {Array.from({ length: SUN_RAYS }, (_, i) => {
          const long = i % 2 === 0;
          const length = (long ? 1.9 : 1.55) * r - r * 0.9;
          const thickness = r * (long ? 0.32 : 0.26);
          return (
            <View key={i} style={[styles.abs, { transform: [{ rotate: `${i * (360 / SUN_RAYS)}deg` }] }]}>
              <View
                style={[
                  styles.abs,
                  {
                    left: r * 0.9,
                    top: -thickness / 2,
                    width: length,
                    height: thickness,
                    borderRadius: thickness / 2,
                    backgroundColor: long ? colors.fxSunRayAlt : colors.fxSunRay,
                    borderColor: ink,
                    borderWidth: 2.5,
                  },
                ]}
              />
            </View>
          );
        })}
      </Animated.View>
      <Animated.View
        style={[styles.abs, circle(r), { backgroundColor: colors.fxSunFace, borderColor: ink, borderWidth: 3 }, pulseStyle]}
      >
        {/* eyes, smile, cheeks — relative to the disc */}
        <View style={[styles.abs, eye(r, -0.3, ink)]} />
        <View style={[styles.abs, eye(r, 0.3, ink)]} />
        <View
          style={[
            styles.abs,
            {
              left: r - 3 - r * 0.24,
              top: r - 3 + r * 0.02,
              width: r * 0.48,
              height: r * 0.26,
              borderColor: ink,
              borderBottomWidth: 2.5,
              borderLeftWidth: 2.5,
              borderRightWidth: 2.5,
              borderBottomLeftRadius: r * 0.24,
              borderBottomRightRadius: r * 0.24,
            },
          ]}
        />
        <View style={[styles.abs, cheek(r, -0.55)]} />
        <View style={[styles.abs, cheek(r, 0.55)]} />
        <View
          style={[
            styles.abs,
            {
              left: r - 3 - r * 0.45,
              top: r - 3 - r * 0.5,
              width: r * 0.3,
              height: r * 0.14,
              borderRadius: r * 0.07,
              backgroundColor: colors.fxShine,
              transform: [{ rotate: '-35deg' }],
            },
          ]}
        />
      </Animated.View>
    </>
  );
});

/** Eye ellipse at horizontal offset `dx` (× r) on a disc of radius r with a 3px border. */
function eye(r: number, dx: number, ink: string) {
  return {
    left: r - 3 + dx * r - r * 0.08,
    top: r - 3 - r * 0.05 - r * 0.12,
    width: r * 0.16,
    height: r * 0.24,
    borderRadius: r * 0.08,
    backgroundColor: ink,
  };
}

function cheek(r: number, dx: number) {
  return {
    left: r - 3 + dx * r - r * 0.14,
    top: r - 3 + r * 0.2 - r * 0.09,
    width: r * 0.28,
    height: r * 0.18,
    borderRadius: r * 0.09,
    backgroundColor: colors.fxCheek,
  };
}

function Sparkle({ spark, time }: { spark: SparkSpec; time: SharedValue<number> }) {
  const style = useAnimatedStyle(() => {
    const a = 0.5 + 0.5 * Math.sin(time.get() * spark.sp + spark.ph);
    return { opacity: 0.35 + 0.55 * a, transform: [{ scale: 0.5 + 0.5 * a }] };
  });
  const size = spark.s * 2.4;
  return (
    <Animated.View style={[styles.abs, { left: spark.x - size / 2, top: spark.y - size / 2 }, style]}>
      <MaterialCommunityIcons name="star-four-points" size={size} color={colors.fxSparkle} />
    </Animated.View>
  );
}

// ─── Clouds ─────────────────────────────────────────────────────────────────────

/** Puffs of the cartoon cloud: [cx, cy, r] in units of the cloud's size. */
const PUFFS = [
  [-0.95, 0.12, 0.42],
  [-0.42, -0.2, 0.58],
  [0.22, -0.34, 0.7],
  [0.88, 0.02, 0.48],
] as const;
/** Outline half-width (the design strokes 5px under the fill). */
const CLOUD_OUTLINE = 2.5;

function CloudShape({ s, color, grow }: { s: number; color: string; grow: number }) {
  return (
    <>
      {PUFFS.map(([cx, cy, r], i) => (
        <View
          key={i}
          style={[
            styles.abs,
            {
              left: (cx - r) * s - grow,
              top: (cy - r) * s - grow,
              width: 2 * r * s + 2 * grow,
              height: 2 * r * s + 2 * grow,
              borderRadius: r * s + grow,
              backgroundColor: color,
            },
          ]}
        />
      ))}
      <View
        style={[
          styles.abs,
          {
            left: -1.35 * s - grow,
            top: -0.05 * s - grow,
            width: 2.7 * s + 2 * grow,
            height: 0.58 * s + 2 * grow,
            borderRadius: 0.29 * s + grow,
            backgroundColor: color,
          },
        ]}
      />
    </>
  );
}

const Cloud = memo(function Cloud({
  spec,
  time,
  width,
  fill,
  shade,
  ink,
}: {
  spec: CloudSpec;
  time: SharedValue<number>;
  width: number;
  fill: string;
  shade: string;
  ink: string;
}) {
  const { s } = spec;
  const span = width + 3.1 * s + 60;
  const style = useAnimatedStyle(() => {
    const t = time.get();
    const x = wrap(spec.x0 + (spec.sp * t) / FRAME_MS + 1.6 * s, span) - 1.6 * s;
    return { transform: [{ translateX: x }, { translateY: spec.y + Math.sin(t * 0.0012 + spec.ph) * 3 }] };
  });
  return (
    <Animated.View style={[styles.origin, style]}>
      <CloudShape s={s} color={ink} grow={CLOUD_OUTLINE} />
      <CloudShape s={s} color={fill} grow={0} />
      <View
        style={[
          styles.abs,
          { left: -1.2 * s, top: 0.24 * s, width: 2.4 * s, height: 0.22 * s, borderRadius: 0.11 * s, backgroundColor: shade },
        ]}
      />
    </Animated.View>
  );
});

// ─── Rain ───────────────────────────────────────────────────────────────────────

const Drop = memo(function Drop({
  index,
  drop,
  time,
  width,
  wind,
  ink,
  dark,
}: {
  index: number;
  drop: DropSpec;
  time: SharedValue<number>;
  width: number;
  wind: number;
  ink: string;
  dark: boolean;
}) {
  const { r } = drop;
  const fall = (drop.ground - drop.start) / drop.s;
  const period = fall + SPLASH_FRAMES;
  const tilt = Math.atan2(wind, 6);

  /** Where this drop is in its current fall → splash cycle. */
  const phase = () => {
    'worklet';
    const frames = time.get() / FRAME_MS + drop.offset;
    const cycle = Math.floor(frames / period);
    const local = frames - cycle * period;
    const x = hash(index, cycle) * (width + 80) - 40 + wind * Math.min(local, fall);
    return { local, x };
  };

  const dropStyle = useAnimatedStyle(() => {
    const { local, x } = phase();
    const falling = local < fall;
    return {
      opacity: falling ? 1 : 0,
      transform: [
        { translateX: x - r },
        { translateY: drop.start + drop.s * Math.min(local, fall) - r },
        { rotate: `${-tilt}rad` },
        { scaleY: 1.35 },
        { rotate: '45deg' },
      ],
    };
  });
  const splashStyle = useAnimatedStyle(() => {
    const { local, x } = phase();
    const a = (local - fall) / SPLASH_FRAMES;
    const on = a >= 0 && a < 1;
    return {
      opacity: on ? 1 - a : 0,
      transform: [{ translateX: x }, { translateY: drop.ground }, { scale: 0.4 + (on ? a : 0) }],
    };
  });

  return (
    <>
      <Animated.View
        style={[
          styles.origin,
          {
            width: 2 * r,
            height: 2 * r,
            borderRadius: r,
            borderTopLeftRadius: 0,
            backgroundColor: dark ? colors.fxDropDark : colors.fxDrop,
            borderColor: ink,
            borderWidth: 1.6,
          },
          dropStyle,
        ]}
      >
        <View
          style={[
            styles.abs,
            { left: r * 0.75, top: r * 0.45, width: r * 0.5, height: r * 0.5, borderRadius: r * 0.25, backgroundColor: colors.fxShine },
          ]}
        />
      </Animated.View>
      <Animated.View style={[styles.origin, splashStyle]}>
        <View style={[styles.splash, { transform: [{ rotate: '-40deg' }, { translateY: -7 }] }]} />
        <View style={[styles.splash, { transform: [{ translateY: -9 }] }]} />
        <View style={[styles.splash, { transform: [{ rotate: '40deg' }, { translateY: -7 }] }]} />
      </Animated.View>
    </>
  );
});

const Leaf = memo(function Leaf({
  leaf,
  time,
  width,
  height,
  ink,
}: {
  leaf: LeafSpec;
  time: SharedValue<number>;
  width: number;
  height: number;
  ink: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = time.get();
    const f = t / FRAME_MS;
    const x = wrap(leaf.x0 + leaf.vx * f + 40, width + 300) - 260;
    const y = wrap(leaf.y0 + leaf.vy * f + Math.sin(t * 0.003 + leaf.ph) * 20 + 40, height + 80) - 40;
    return {
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${leaf.rot + leaf.vr * f}rad` },
        { scaleY: 0.4 + 0.6 * Math.abs(Math.cos(t * 0.004 + leaf.ph)) },
      ],
    };
  });
  const { sz } = leaf;
  return (
    <Animated.View style={[styles.origin, style]}>
      <View
        style={[
          styles.abs,
          {
            left: -sz,
            top: -sz * 0.45,
            width: sz * 2,
            height: sz * 0.9,
            borderRadius: sz,
            backgroundColor: leaf.color,
            borderColor: ink,
            borderWidth: 1.8,
          },
        ]}
      />
      <View style={[styles.abs, { left: -sz * 1.3, top: -0.9, width: sz * 2, height: 1.8, backgroundColor: ink }]} />
    </Animated.View>
  );
});

/** Flash of light + a cartoon bolt every few seconds (deterministic timing per period). */
function Lightning({ time, width, ink }: { time: SharedValue<number>; width: number; ink: string }) {
  const strike = () => {
    'worklet';
    const t = time.get();
    let n = Math.floor(t / LIGHTNING_PERIOD_MS);
    let at = n * LIGHTNING_PERIOD_MS + 1500 + hash(n, 7) * 3500;
    if (t < at) {
      n -= 1;
      at = n * LIGHTNING_PERIOD_MS + 1500 + hash(n, 7) * 3500;
    }
    const level = n < 0 ? 0 : Math.pow(0.9, (t - at) / FRAME_MS);
    return { n, level };
  };
  const flashStyle = useAnimatedStyle(() => ({ opacity: strike().level }));
  const boltStyle = useAnimatedStyle(() => {
    const { n, level } = strike();
    return {
      opacity: level > 0.25 ? 1 : 0,
      transform: [{ translateX: 40 + hash(n, 3) * (width - 140) }, { translateY: 60 + hash(n, 5) * 60 }],
    };
  });
  return (
    <>
      <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: colors.fxFlash }, flashStyle]} />
      <Animated.View style={[styles.origin, boltStyle]}>
        <MaterialCommunityIcons
          name="lightning-bolt"
          size={110}
          color={colors.fxBolt}
          style={[styles.outlined, { textShadowColor: ink }]}
        />
      </Animated.View>
    </>
  );
}

// ─── Snow ───────────────────────────────────────────────────────────────────────

const Flake = memo(function Flake({
  flake,
  time,
  height,
  ink,
}: {
  flake: FlakeSpec;
  time: SharedValue<number>;
  height: number;
  ink: string;
}) {
  const style = useAnimatedStyle(() => {
    const t = time.get();
    const f = t / FRAME_MS;
    return {
      transform: [
        { translateX: flake.x0 + Math.sin(t * 0.0012 + flake.ph) * 30 },
        { translateY: wrap(flake.y0 + flake.s * f + 14, height + 28) - 14 },
        { rotate: `${flake.rot + flake.vr * f}rad` },
      ],
    };
  });
  const { r } = flake;
  return (
    <Animated.View style={[styles.origin, style]}>
      {flake.puff ? (
        <View
          style={[
            styles.abs,
            {
              left: -r * 0.55,
              top: -r * 0.55,
              width: r * 1.1,
              height: r * 1.1,
              borderRadius: r * 0.55,
              backgroundColor: colors.fxCloud,
              borderColor: ink,
              borderWidth: 1.6,
            },
          ]}
        />
      ) : (
        <MaterialCommunityIcons
          name="snowflake"
          size={r * 2.2}
          color={colors.fxCloud}
          style={[styles.abs, styles.outlined, { left: -r * 1.1, top: -r * 1.1, textShadowColor: ink }]}
        />
      )}
    </Animated.View>
  );
});

const styles = StyleSheet.create({
  layer: {
    overflow: 'hidden',
  },
  front: {
    zIndex: 4,
    elevation: 4,
  },
  abs: {
    position: 'absolute',
  },
  origin: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  sunRing: {
    borderWidth: 3,
    borderStyle: 'dashed',
    borderColor: colors.fxSunRing,
  },
  splash: {
    position: 'absolute',
    left: -1,
    top: -5,
    width: 2,
    height: 10,
    borderRadius: 1,
    backgroundColor: colors.fxSplash,
  },
  outlined: {
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 2,
  },
});
