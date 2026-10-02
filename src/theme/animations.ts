/** Motion tokens (ms / spring configs). Keep motion soft and physical. */
export const durations = {
  instant: 80,
  flash: 140,
  fast: 200,
  normal: 320,
  slow: 520,
  /** Time for a Polaroid to fully "develop". */
  develop: 2600,
  /** Viewfinder resize when the frame knob turns (design: 0.35s). */
  frameMorph: 350,
  /** Dial rotation (design: 0.45–0.5s). */
  dial: 480,
  /** Pane / sheet slide. */
  pane: 340,
} as const;

/** Bezier curves from the design: cubic-bezier(.3,.7,.2,1) for dials and knobs. */
export const easings = {
  dial: [0.3, 0.7, 0.2, 1] as const,
} as const;

export const springs = {
  gentle: { damping: 18, stiffness: 160, mass: 1 },
  bouncy: { damping: 12, stiffness: 220, mass: 0.9 },
  snappy: { damping: 22, stiffness: 320, mass: 0.8 },
} as const;

/** Entry animation for photo cards: scale 0.9→1, opacity 0→1. */
export const cardEntry = {
  fromScale: 0.9,
  toScale: 1,
  fromOpacity: 0,
  toOpacity: 1,
  staggerMs: 60,
  maxStaggerItems: 8,
} as const;

export const pressFeedback = {
  scale: 0.94,
  shutterScale: 0.88,
  /** Wide rows/cards: a subtle squish. */
  rowScale: 0.98,
} as const;
