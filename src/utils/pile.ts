import type { FrameType } from '@/models';
import { printFormats, printRotations } from '@/theme';
import { hashString } from './rotation';

/** Most prints drawn in the scattered pile; the rest sit behind a "+N tấm nữa" chip. */
export const MAX_PILE_PRINTS = 6;

/** Height / width of the nominal (square-format) slot every print is fitted into. */
const SLOT_ASPECT = printFormats.square.h / printFormats.square.w;
/** Keeps prints off the screen edges (and mostly clear of the 26pt edge tabs). */
const SIDE_MARGIN = 20;
const VERTICAL_MARGIN = 6;
/** Seeded wobble applied to the template position, as a fraction of the free space. */
const JITTER = 0.07;
/** A wide print may be this much wider than its slot. */
const WIDE_OVERSHOOT = 1.2;

interface SizeRule {
  /** Slot width as a fraction of the container width. */
  widthFactor: number;
  /** Slot height as a fraction of the container height. */
  heightFactor: number;
}

/** Index = number of prints. */
const SIZE_RULES: readonly SizeRule[] = [
  { widthFactor: 0.5, heightFactor: 0.7 },
  { widthFactor: 0.66, heightFactor: 0.92 },
  { widthFactor: 0.56, heightFactor: 0.68 },
  { widthFactor: 0.52, heightFactor: 0.7 },
  { widthFactor: 0.5, heightFactor: 0.62 },
  { widthFactor: 0.46, heightFactor: 0.58 },
  { widthFactor: 0.44, heightFactor: 0.55 },
];

/** Where each print sits inside the free area (0..1, 0..1), oldest → newest (last = on top). */
const TEMPLATES: readonly (readonly (readonly [number, number])[])[] = [
  [],
  [[0.5, 0.5]],
  [
    [0.05, 0.06],
    [0.95, 0.94],
  ],
  [
    [0, 0.08],
    [1, 0],
    [0.45, 0.95],
  ],
  [
    [0, 0],
    [1, 0.05],
    [0.1, 1],
    [0.6, 0.62],
  ],
  [
    [0, 0],
    [1, 0.02],
    [0, 0.95],
    [1, 0.9],
    [0.5, 0.5],
  ],
  [
    [0, 0],
    [1, 0],
    [0, 0.55],
    [1, 0.55],
    [0.5, 0.12],
    [0.5, 0.88],
  ],
];

export interface PileItem {
  /** Index into the `seeds` passed in. */
  index: number;
  /** Top-left of the (nominal) slot, relative to the container. */
  left: number;
  top: number;
  rotation: number;
  /** Paint order: later = on top. */
  zIndex: number;
}

export interface PileLayout {
  /** Width of the nominal slot every print is fitted into. */
  slotWidth: number;
  slotHeight: number;
  items: PileItem[];
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Deterministic value in [-1, 1] derived from a seed and a channel. */
function wobble(seed: string, channel: number): number {
  return ((hashString(`${seed}:${channel}`) % 2001) / 1000 - 1);
}

/** Tilt per print; neighbours never share the same tilt. */
function rotationsFor(seeds: readonly string[]): number[] {
  const rotations: number[] = [];
  seeds.forEach((seed, i) => {
    let pick = hashString(seed) % printRotations.length;
    if (i > 0 && printRotations[pick] === rotations[i - 1]) pick = (pick + 1) % printRotations.length;
    rotations.push(printRotations[pick]);
  });
  return rotations;
}

/**
 * Scattered, overlapping table of prints. Pure and deterministic: positions and tilts come from
 * the photo ids, so a pile never jumps between renders. `seeds` is oldest → newest; the last
 * one is drawn on top. At most MAX_PILE_PRINTS are laid out (pass the newest ones).
 */
export function layoutPile(seeds: readonly string[], width: number, height: number): PileLayout {
  const count = Math.min(seeds.length, MAX_PILE_PRINTS);
  const visible = seeds.slice(seeds.length - count);
  const rule = SIZE_RULES[count] ?? SIZE_RULES[1];
  const safeWidth = Math.max(width, 0);
  const safeHeight = Math.max(height, 0);
  const slotWidth = Math.min(safeWidth * rule.widthFactor, (safeHeight * rule.heightFactor) / SLOT_ASPECT);
  const slotHeight = slotWidth * SLOT_ASPECT;
  const freeX = Math.max(safeWidth - slotWidth - SIDE_MARGIN * 2, 0);
  const freeY = Math.max(safeHeight - slotHeight - VERTICAL_MARGIN * 2, 0);
  const rotations = rotationsFor(visible);
  const template = TEMPLATES[count] ?? [];
  const items = visible.map((seed, i): PileItem => {
    const [fx, fy] = template[i];
    // The newest print stays where it is meant to be; older ones wobble a little.
    const jitter = count === 1 ? 0 : i === count - 1 ? JITTER / 2 : JITTER;
    const x = clamp(fx + wobble(seed, 1) * jitter, 0, 1);
    const y = clamp(fy + wobble(seed, 2) * jitter, 0, 1);
    return {
      index: seeds.length - count + i,
      left: SIDE_MARGIN + x * freeX,
      top: VERTICAL_MARGIN + y * freeY,
      rotation: count === 1 ? rotations[i] / 2 : rotations[i],
      zIndex: i + 1,
    };
  });
  return { slotWidth, slotHeight, items };
}

/** Width of a print of `frameType` that fits a slot (mini is height-limited, wide width-limited). */
export function fitPrintWidth(slotWidth: number, frameType: FrameType): number {
  const format = printFormats[frameType];
  const slotHeight = slotWidth * SLOT_ASPECT;
  return Math.min(slotWidth * WIDE_OVERSHOOT, (slotHeight * format.w) / format.h);
}

export interface ColumnLayout {
  slotWidth: number;
  slotHeight: number;
  /** Total content height for the scroll view. */
  contentHeight: number;
  items: PileItem[];
}

const COLUMN_WIDTH_FACTOR = 0.58;
const COLUMN_MAX_SLOT = 240;
/** Fraction of a slot's height each row advances (prints overlap a little). */
const COLUMN_STEP = 0.9;

/** Expanded view of a long day: every print, oldest first, zig-zagging down a scrollable column. */
export function layoutColumn(seeds: readonly string[], width: number): ColumnLayout {
  const safeWidth = Math.max(width, 0);
  const slotWidth = Math.min(safeWidth * COLUMN_WIDTH_FACTOR, COLUMN_MAX_SLOT);
  const slotHeight = slotWidth * SLOT_ASPECT;
  const freeX = Math.max(safeWidth - slotWidth - SIDE_MARGIN * 2, 0);
  const rotations = rotationsFor(seeds);
  const items = seeds.map((seed, i): PileItem => {
    const side = i % 2 === 0 ? 0.1 : 0.9;
    const x = clamp(side + wobble(seed, 3) * JITTER, 0, 1);
    return {
      index: i,
      left: SIDE_MARGIN + x * freeX,
      top: VERTICAL_MARGIN + i * slotHeight * COLUMN_STEP,
      rotation: rotations[i],
      zIndex: i + 1,
    };
  });
  const contentHeight =
    seeds.length === 0 ? 0 : VERTICAL_MARGIN * 2 + slotHeight + (seeds.length - 1) * slotHeight * COLUMN_STEP;
  return { slotWidth, slotHeight, contentHeight, items };
}
