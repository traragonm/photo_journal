/** Detail screen sizes from the 390-wide design; everything scales with `detailScale(width)`. */
export const DESIGN_WIDTH = 390;
export const PRINT_WIDTH = 300;
/** Square / wide prints are shorter, so they may be wider than the tall mini print. */
export const PRINT_WIDTH_WIDE = 330;
export const PRINT_TILT = -1.5;
export const STRIP_WIDTH = 340;
export const ACTION_SIZE = 52;
export const ACTION_GAP = 18;

export function detailScale(screenWidth: number): number {
  return Math.min(1, screenWidth / DESIGN_WIDTH);
}
