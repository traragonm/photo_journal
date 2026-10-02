/**
 * Pure geometry for the camera body (ported from docs/design/Camera.dc.html).
 * All "design" numbers are in artboard units (390 × 844); views multiply them by `scale`.
 * Functions marked 'worklet' are also called from gesture callbacks on the UI thread.
 */
import { FILM_FILTERS, FRAME_TYPES, type FilmFilter, type FrameType, type ZoomStop } from '@/models';
import { printFormats } from '@/theme';

const DEG_PER_RAD = 180 / Math.PI;
const FULL_TURN = 360;
const HALF_TURN = 180;

// ─── Artboard layout ────────────────────────────────────────────────────────────

export const DESIGN_WIDTH = 390;
/** Viewfinder print bounds (design: k = min(340 / w, 400 / h)). */
export const VIEWFINDER_MAX_WIDTH = 340;
export const VIEWFINDER_MAX_HEIGHT = 400;
/** Minimum horizontal margin around the viewfinder print. */
const VIEWFINDER_SIDE_MARGIN = 25;
/** Breathing room above / below the print inside its area. */
const VIEWFINDER_VERTICAL_MARGIN = 16;
/** Design height the viewfinder area should get before the body starts shrinking. */
const VIEWFINDER_COMFORT_HEIGHT = 340;

/** Top row of round buttons: offset below the safe area, height, gap to the viewfinder. */
export const TOP_ROW_MARGIN = 12;
export const TOP_ROW_HEIGHT = 44;
const TOP_ROW_GAP = 14;
/** Top-row horizontal inset (design: left 56 leaves room for the "NHẬT KÝ" edge tab; right 24). */
export const TOP_ROW_LEFT = 56;
export const TOP_ROW_RIGHT = 24;

/**
 * The bottom "cluster" (last print, readout, knob, dial) is laid out in its own box whose
 * origin is artboard y = 532 (top of the knob's "SQ" label). It ends 12 below the shutter.
 */
const CLUSTER_ORIGIN_Y = 532;
export const CLUSTER_HEIGHT = 312;
/** The viewfinder area may extend this far into the cluster box (empty space left of the knob labels). */
const CLUSTER_OVERLAP = 20;

export const cluster = {
  lastPrint: { left: 20, top: 572 - CLUSTER_ORIGIN_Y, width: 52, height: 64, printWidth: 40, tilt: -6 },
  readout: { left: 130, top: 588 - CLUSTER_ORIGIN_Y, width: 130 },
  knob: { left: 287, top: 573 - CLUSTER_ORIGIN_Y, size: 62, ring: 6, capSize: 50 },
  knobCenter: { x: 318, y: 604 - CLUSTER_ORIGIN_Y },
  knobLabelRadius: 58,
  knobLabel: { width: 44, height: 28 },
  knobIndicator: { left: 23, top: 4, width: 4, height: 17 },
  pointer: { left: 187, top: 626 - CLUSTER_ORIGIN_Y, halfWidth: 8, height: 12 },
  dial: { left: 45, top: 640 - CLUSTER_ORIGIN_Y },
} as const;

/** The big dial (in dial-local design units; 300 × 300). */
export const dial = {
  size: 300,
  center: 150,
  knurlWidth: 5,
  outerTickOuter: 145,
  outerTickMajorInner: 131,
  outerTickMinorInner: 138,
  outerTickStep: 5,
  tickWidth: 1.5,
  zoomLabelRadius: 118,
  zoomLabel: { width: 44, height: 32 },
  inner: { offset: 45, size: 210, brass: 2 },
  innerTickOuter: 98,
  innerTickInner: 90,
  innerTickStart: 30,
  swatchRadius: 80,
  swatchHit: 40,
  swatchSize: 22,
  innerPointer: { left: 144, top: 47, halfWidth: 6, height: 9 },
  shutter: { offset: 108, size: 84, ring: 4, gap: 6 },
} as const;

export interface CameraLayoutInput {
  width: number;
  height: number;
  insetTop: number;
  insetBottom: number;
}

export interface CameraLayout {
  /** Multiplier for every design dimension of the body (≤ 1). */
  scale: number;
  topRowTop: number;
  /** Left edge of the (centred) cluster box. */
  clusterLeft: number;
  clusterTop: number;
  viewfinderTop: number;
  viewfinderHeight: number;
  /** Bounds the viewfinder print must fit in. */
  printMaxWidth: number;
  printMaxHeight: number;
}

/**
 * Lays the camera body out in a pane of the given size: top row under the safe area,
 * the dial cluster anchored above the bottom safe area (shutter always fully visible),
 * the viewfinder print fitted in between. Shrinks the body on narrow or short panes.
 */
export function computeCameraLayout({ width, height, insetTop, insetBottom }: CameraLayoutInput): CameraLayout {
  const topRowTop = insetTop + TOP_ROW_MARGIN;
  const viewfinderTop = topRowTop + TOP_ROW_HEIGHT + TOP_ROW_GAP;
  const bottom = height - insetBottom;
  const heightScale = (bottom - viewfinderTop) / (CLUSTER_HEIGHT - CLUSTER_OVERLAP + VIEWFINDER_COMFORT_HEIGHT);
  const scale = Math.max(0, Math.min(1, width / DESIGN_WIDTH, heightScale));
  const clusterTop = bottom - CLUSTER_HEIGHT * scale;
  const viewfinderHeight = Math.max(0, clusterTop + CLUSTER_OVERLAP * scale - viewfinderTop);
  return {
    scale,
    topRowTop,
    clusterLeft: (width - DESIGN_WIDTH * scale) / 2,
    clusterTop,
    viewfinderTop,
    viewfinderHeight,
    printMaxWidth: Math.max(0, Math.min(VIEWFINDER_MAX_WIDTH * scale, width - 2 * VIEWFINDER_SIDE_MARGIN)),
    printMaxHeight: Math.max(
      0,
      Math.min(VIEWFINDER_MAX_HEIGHT * scale, viewfinderHeight - 2 * VIEWFINDER_VERTICAL_MARGIN * scale),
    ),
  };
}

// ─── Viewfinder print ───────────────────────────────────────────────────────────

export interface PrintBox {
  width: number;
  height: number;
  /** Side + top border. */
  pad: number;
  imageWidth: number;
  imageHeight: number;
}

/** Largest print of the given format that fits `maxWidth × maxHeight` (design's `k`). */
export function fitPrint(frameType: FrameType, maxWidth: number, maxHeight: number): PrintBox {
  const format = printFormats[frameType];
  const k = Math.max(0, Math.min(maxWidth / format.w, maxHeight / format.h));
  return {
    width: Math.round(format.w * k),
    height: Math.round(format.h * k),
    pad: Math.round(((format.w - format.iw) / 2) * k),
    imageWidth: Math.round(format.iw * k),
    imageHeight: Math.round(format.ih * k),
  };
}

/**
 * Size of the camera preview inside the window: big enough to cover the window of every
 * format, so the native preview never resizes while the window morphs — the window only
 * reveals a different centred crop.
 */
export function previewCoverBox(maxWidth: number, maxHeight: number): { width: number; height: number } {
  return FRAME_TYPES.reduce(
    (box, type) => {
      const print = fitPrint(type, maxWidth, maxHeight);
      return { width: Math.max(box.width, print.imageWidth), height: Math.max(box.height, print.imageHeight) };
    },
    { width: 0, height: 0 },
  );
}

// ─── Polar helpers ──────────────────────────────────────────────────────────────

const toRadians = (degrees: number) => degrees / DEG_PER_RAD;

/** Top-left of a `w × h` box centred on the point at `radius` / `angle` (0° = up, clockwise). */
export function polarBox(
  center: number,
  radius: number,
  angle: number,
  w: number,
  h: number,
): { left: number; top: number } {
  const x = center + radius * Math.sin(toRadians(angle));
  const y = center - radius * Math.cos(toRadians(angle));
  return { left: x - w / 2, top: y - h / 2 };
}

/** Same as `polarBox` around an arbitrary centre. */
export function polarBoxAround(
  centerX: number,
  centerY: number,
  radius: number,
  angle: number,
  w: number,
  h: number,
): { left: number; top: number } {
  return {
    left: centerX + radius * Math.sin(toRadians(angle)) - w / 2,
    top: centerY - radius * Math.cos(toRadians(angle)) - h / 2,
  };
}

/** Angle of a point around a centre, in degrees: 0 = up, clockwise positive, (-180, 180]. */
export function angleOfPoint(x: number, y: number, centerX: number, centerY: number): number {
  'worklet';
  return Math.atan2(x - centerX, centerY - y) * DEG_PER_RAD;
}

/** Wraps an angle difference into [-180, 180). */
export function wrapDelta(delta: number): number {
  'worklet';
  return ((((delta + HALF_TURN) % FULL_TURN) + FULL_TURN) % FULL_TURN) - HALF_TURN;
}

/** The angle equivalent to `target` (mod 360) closest to `current` — shortest spin. */
export function nearestEquivalentAngle(current: number, target: number): number {
  'worklet';
  return current + wrapDelta(target - current);
}

// ─── Outer ring: zoom ───────────────────────────────────────────────────────────

export interface ZoomStopSpec {
  stop: ZoomStop;
  /** Label on the dial (".5×"). */
  dialLabel: string;
  /** Label in the readout / badge ("0.5×"). */
  label: string;
  /** Position on the ring (design ZA). */
  angle: number;
  /**
   * expo-camera `zoom` (0…1 = fraction of the device's digital zoom range). APPROXIMATE:
   * the range differs per device (iOS ≈ 1…16× factor, Android CameraX linear zoom between
   * the min and max ratio), so these give roughly the named magnification on common phones.
   * expo-camera can't switch to the ultra-wide lens, so ".5×" is just the widest view (0),
   * the same as 1× on most devices.
   */
  cameraZoom: number;
}

export const ZOOM_STOPS: readonly ZoomStopSpec[] = [
  { stop: 0.5, dialLabel: '.5×', label: '0.5×', angle: -50, cameraZoom: 0 },
  { stop: 1, dialLabel: '1×', label: '1×', angle: -25, cameraZoom: 0 },
  { stop: 2, dialLabel: '2×', label: '2×', angle: 0, cameraZoom: 0.1 },
  { stop: 3, dialLabel: '3×', label: '3×', angle: 25, cameraZoom: 0.2 },
  { stop: 5, dialLabel: '5×', label: '5×', angle: 50, cameraZoom: 0.35 },
];

const ZOOM_ANGLES = ZOOM_STOPS.map((spec) => spec.angle);
const ZOOM_MIN_ROTATION = -Math.max(...ZOOM_ANGLES);
const ZOOM_MAX_ROTATION = -Math.min(...ZOOM_ANGLES);
/** How far a drag may pull the zoom ring past its end stops. */
const ZOOM_OVERDRAG = 12;

export function zoomSpec(stop: ZoomStop): ZoomStopSpec {
  return ZOOM_STOPS.find((spec) => spec.stop === stop) ?? ZOOM_STOPS[1];
}

export function zoomIndexOf(stop: ZoomStop): number {
  return Math.max(0, ZOOM_STOPS.findIndex((spec) => spec.stop === stop));
}

/** Ring rotation that puts the stop under the accent pointer (design: ringRot = -ZA[i]). */
export function zoomRingRotation(index: number): number {
  'worklet';
  return -ZOOM_ANGLES[index];
}

/** Clamp a dragged zoom-ring rotation (allows a little rubber-band overdrag). */
export function clampZoomRotation(rotation: number): number {
  'worklet';
  return Math.min(ZOOM_MAX_ROTATION + ZOOM_OVERDRAG, Math.max(ZOOM_MIN_ROTATION - ZOOM_OVERDRAG, rotation));
}

/** Index of the zoom stop nearest to the pointer for a ring rotation. */
export function snapZoomIndex(rotation: number): number {
  'worklet';
  let best = 0;
  for (let i = 1; i < ZOOM_ANGLES.length; i += 1) {
    if (Math.abs(-rotation - ZOOM_ANGLES[i]) < Math.abs(-rotation - ZOOM_ANGLES[best])) best = i;
  }
  return best;
}

export interface Tick {
  angle: number;
  major: boolean;
}

/** Outer ring ticks every 5°, longer at the zoom stops. */
export function outerTicks(): Tick[] {
  const ticks: Tick[] = [];
  for (let angle = 0; angle < FULL_TURN; angle += dial.outerTickStep) {
    const signed = angle > HALF_TURN ? angle - FULL_TURN : angle;
    ticks.push({ angle, major: ZOOM_ANGLES.includes(signed) });
  }
  return ticks;
}

// ─── Inner ring: film filters ───────────────────────────────────────────────────

export const FILTER_STEP = FULL_TURN / FILM_FILTERS.length;

/** Swatch angle on the inner ring (design: i × 60). */
export function filterAngle(index: number): number {
  return index * FILTER_STEP;
}

export function filterIndexOf(filter: FilmFilter): number {
  return Math.max(0, FILM_FILTERS.indexOf(filter));
}

/** Canonical inner-ring rotation for a filter (design: filterRot = -i × 60). */
export function filterRingRotation(index: number): number {
  'worklet';
  return -index * FILTER_STEP;
}

/** Nearest swatch to the pointer for an (unwrapped) ring rotation, and the rotation that centres it. */
export function snapFilter(rotation: number): { index: number; rotation: number } {
  'worklet';
  const steps = Math.round(-rotation / FILTER_STEP);
  const count = FULL_TURN / FILTER_STEP;
  return { index: ((steps % count) + count) % count, rotation: -steps * FILTER_STEP };
}

/** Short ticks between swatches (30°, 90°, …). */
export function innerTickAngles(): number[] {
  const angles: number[] = [];
  for (let angle = dial.innerTickStart; angle < FULL_TURN; angle += FILTER_STEP) angles.push(angle);
  return angles;
}

// ─── Which ring a touch grabbed ─────────────────────────────────────────────────

export type DialRing = 'outer' | 'inner' | 'none';

/** Hit-test by distance from the dial centre (design units): shutter → none, dark ring → inner, cream → outer. */
export function ringAt(distance: number): DialRing {
  'worklet';
  const shutterRadius = dial.shutter.size / 2 + dial.shutter.gap;
  const innerRadius = dial.inner.size / 2 + dial.inner.brass;
  if (distance <= shutterRadius) return 'none';
  if (distance <= innerRadius) return 'inner';
  if (distance <= dial.size / 2) return 'outer';
  return 'none';
}

// ─── Frame-type knob ────────────────────────────────────────────────────────────

export const FRAME_KNOB: Record<FrameType, { short: string; name: string; angle: number }> = {
  mini: { short: 'MINI', name: 'Mini', angle: -55 },
  square: { short: 'SQ', name: 'Square', angle: 0 },
  wide: { short: 'WIDE', name: 'Wide', angle: 55 },
};

export function nextFrameType(current: FrameType): FrameType {
  return FRAME_TYPES[(FRAME_TYPES.indexOf(current) + 1) % FRAME_TYPES.length];
}

/** Knurl (alternating light/dark segments) around a ring: centre angles of the light segments. */
export function knurlAngles(segmentDegrees: number): number[] {
  const angles: number[] = [];
  for (let angle = segmentDegrees / 2; angle < FULL_TURN; angle += segmentDegrees * 2) angles.push(angle);
  return angles;
}

/** Arc length of `degrees` on a circle of `radius` — width of a knurl segment. */
export function arcLength(radius: number, degrees: number): number {
  return (2 * Math.PI * radius * degrees) / FULL_TURN;
}
