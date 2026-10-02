import { colors } from '@/theme';

const HEX_SHORT = 3;
const HEX_RADIX = 16;
const CHANNEL_SPAN = 2;

/** `#RRGGBB` (or `#RGB`) theme colour → `rgba(r,g,b,alpha)`. */
export function withAlpha(hex: string, alpha: number): string {
  let digits = hex.replace('#', '');
  if (digits.length === HEX_SHORT) {
    digits = digits
      .split('')
      .map((digit) => digit + digit)
      .join('');
  }
  const channel = (index: number) =>
    parseInt(digits.slice(index * CHANNEL_SPAN, index * CHANNEL_SPAN + CHANNEL_SPAN), HEX_RADIX);
  return `rgba(${channel(0)},${channel(1)},${channel(2)},${alpha})`;
}

/** Camera-only colours derived from the theme (design values from Camera.dc.html). */
export const cameraColors = {
  /** Viewfinder print border (design: white frame regardless of the user's border colour). */
  viewfinderFill: colors.frameWhite,
  viewfinderHint: colors.frameInkSoft,
  viewfinderEmpty: colors.undevelopedFilm,
  bracket: colors.white,
  badgeText: colors.white,
  /** Unselected film swatch outline (design: 0 0 0 1px rgba(255,255,255,0.25)). */
  swatchOutline: withAlpha(colors.white, 0.25),
  /** Scrim behind the developing print. */
  developScrim: withAlpha(colors.cameraBody, 0.86),
  /** Milky wash a print passes through while developing. */
  developWash: colors.frameWhite,
  toastBackground: colors.onInk,
  toastText: colors.ink,
  countdownText: colors.white,
  countdownShadow: withAlpha(colors.black, 0.45),
} as const;
