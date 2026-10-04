/**
 * Pure geometry for the camera body (ported from docs/design/Camera.dc.html).
 * All "design" numbers are in artboard units (390 × 844); views multiply them by `scale`.
 * Functions marked 'worklet' are also called from gesture callbacks on the UI thread.
 */
import { FILM_FILTERS, FRAME_TYPES, type FilmFilter, type FrameType, type ZoomStop } from '@/models';
import { printFormats } from '@/theme';

// ─── Artboard layout ────────────────────────────────────────────────────────────

export const DESIGN_WIDTH = 390;
/** Viewfinder print bounds (design: k = min(356 / w, 430 / h)). */
export const VIEWFINDER_MAX_WIDTH = 356;
export const VIEWFINDER_MAX_HEIGHT = 430;
/** Gap between the safe area and the viewfinder area (design: top 14). */
export const VIEWFINDER_TOP_MARGIN = 14;
/** Minimum horizontal margin around the viewfinder print. */
const VIEWFINDER_SIDE_MARGIN = 17;
/** Breathing room above / below the print inside its area (design: 440 area, 430 print). */
const VIEWFINDER_VERTICAL_MARGIN = 5;
/** Design height the viewfinder area should get before the body starts shrinking. */
const VIEWFINDER_COMFORT_HEIGHT = 340;

/**
 * The controls below the viewfinder are laid out in their own box whose origin is
 * artboard y = 454 (bottom of the viewfinder area). It ends 16 below the shutter.
 */
const CLUSTER_ORIGIN_Y = 454;
export const CLUSTER_HEIGHT = 824 - CLUSTER_ORIGIN_Y;

const y = (artboardY: number) => artboardY - CLUSTER_ORIGIN_Y;

export const cluster = {
  /** Amber pointer above the zoom ruler (centred). */
  pointer: { top: y(462), halfWidth: 6, height: 9 },
  zoomStrip: { top: y(470), height: 44, item: 72 },
  filterStrip: { top: y(522), height: 82, item: 72 },
  /** Flash (left) and timer (right) slide switches, flanking the frame drum. */
  switches: { top: y(634), height: 44, flashLeft: 14, timerLeft: 238 },
  frameDrum: { left: 165, top: y(620), width: 60, height: 76, item: 52 },
  shutter: { left: 155, top: y(728), size: 80 },
  weatherDrum: { left: 20, top: y(747) },
  moodDrum: { left: 270, top: y(747) },
} as const;

/** Horizontal LCD drum (weather / mood) and the strip that pops out while it is dragged. */
export const drum = {
  width: 100,
  height: 42,
  item: 64,
  overlayWidth: 236,
  overlayHeight: 54,
  overlayTop: -6,
  /** The overlay stays inside the artboard with this margin. */
  overlayMargin: 14,
} as const;

/** Vertical frame drum overlay (design: 72 × 192 at −6 / −58). */
export const frameDrumOverlay = { left: -6, top: -58, width: 72, height: 192 } as const;

export interface CameraLayoutInput {
  width: number;
  height: number;
  insetTop: number;
  insetBottom: number;
}

export interface CameraLayout {
  /** Multiplier for every design dimension of the body (≤ 1). */
  scale: number;
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
 * Lays the camera body out in a pane of the given size: the viewfinder under the safe area,
 * the control cluster anchored above the bottom safe area (shutter always fully visible).
 * Shrinks the body on narrow or short panes.
 */
export function computeCameraLayout({ width, height, insetTop, insetBottom }: CameraLayoutInput): CameraLayout {
  const viewfinderTop = insetTop + VIEWFINDER_TOP_MARGIN;
  const bottom = height - insetBottom;
  const heightScale = (bottom - viewfinderTop) / (CLUSTER_HEIGHT + VIEWFINDER_COMFORT_HEIGHT);
  const scale = Math.max(0, Math.min(1, width / DESIGN_WIDTH, heightScale));
  const clusterTop = bottom - CLUSTER_HEIGHT * scale;
  const viewfinderHeight = Math.max(0, clusterTop - viewfinderTop);
  return {
    scale,
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

/** Left of a drum's pop-out strip, relative to the drum (design: olAbs − left). */
export function drumOverlayLeft(drumLeft: number): number {
  const centred = drumLeft + drum.width / 2 - drum.overlayWidth / 2;
  const max = DESIGN_WIDTH - drum.overlayMargin - drum.overlayWidth;
  return Math.max(drum.overlayMargin, Math.min(max, centred)) - drumLeft;
}

/** Width of each flash / timer switch so it fits between its left edge and the frame drum. */
const SWITCH_MAX_WIDTH = 110;
const SWITCH_MIN_WIDTH = 80;
/** Indicator (18px icon) + gap beside each switch, plus a little air before the drum. */
const SWITCH_INDICATOR = 26;
const SWITCH_CLEARANCE = 4;

export function switchWidth(scale: number): number {
  const room = (cluster.frameDrum.left - cluster.switches.flashLeft) * scale - SWITCH_INDICATOR - SWITCH_CLEARANCE;
  return Math.max(SWITCH_MIN_WIDTH, Math.min(SWITCH_MAX_WIDTH, room));
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

// ─── Snapping strips (zoom ruler, film strip, drums) ────────────────────────────

/** How far a strip may be pulled past its first / last item (design: 30). */
export const STRIP_OVERDRAG = 30;

/** Drag offset clamped so the strip stops a little past either end (design: stripPos dx). */
export function clampStripDrag(start: number, delta: number, count: number, item: number): number {
  'worklet';
  const min = -(count - 1 - start) * item - STRIP_OVERDRAG;
  const max = start * item + STRIP_OVERDRAG;
  return Math.max(min, Math.min(max, delta));
}

/** Item under the pointer after dragging `delta` from `start` (positive delta = towards earlier items). */
export function snapStripIndex(start: number, delta: number, count: number, item: number): number {
  'worklet';
  return Math.max(0, Math.min(count - 1, Math.round(start - delta / item)));
}

// ─── Zoom ruler ─────────────────────────────────────────────────────────────────

export interface ZoomStopSpec {
  stop: ZoomStop;
  /** Label on the ruler (".5×"). */
  rulerLabel: string;
  /** Label in the viewfinder badge ("0.5×"). */
  label: string;
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
  { stop: 0.5, rulerLabel: '.5×', label: '0.5×', cameraZoom: 0 },
  { stop: 1, rulerLabel: '1×', label: '1×', cameraZoom: 0 },
  { stop: 1.5, rulerLabel: '1.5×', label: '1.5×', cameraZoom: 0.05 },
  { stop: 2, rulerLabel: '2×', label: '2×', cameraZoom: 0.1 },
  { stop: 3, rulerLabel: '3×', label: '3×', cameraZoom: 0.2 },
  { stop: 4, rulerLabel: '4×', label: '4×', cameraZoom: 0.27 },
  { stop: 5, rulerLabel: '5×', label: '5×', cameraZoom: 0.35 },
];

export function zoomSpec(stop: ZoomStop): ZoomStopSpec {
  return ZOOM_STOPS.find((spec) => spec.stop === stop) ?? ZOOM_STOPS[1];
}

export function zoomIndexOf(stop: ZoomStop): number {
  return Math.max(0, ZOOM_STOPS.findIndex((spec) => spec.stop === stop));
}

export function filterIndexOf(filter: FilmFilter): number {
  return Math.max(0, FILM_FILTERS.indexOf(filter));
}
