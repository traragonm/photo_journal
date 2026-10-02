import { colors, layout, spacing } from '@/theme';

/** Layout numbers from docs/design/Settings.dc.html, plus tokens derived from `colors`. */
export const SHEET_PADDING = layout.screenGutter;
export const SHEET_TOP_PADDING = spacing.lg;
export const SHEET_BOTTOM_PADDING = spacing.xxl;
/** Gap between the title and the groups, and between groups. */
export const SECTION_GAP = 18;
/** Gap between a group's eyebrow title and its card. */
export const GROUP_TITLE_GAP = 10;
export const CARD_PADDING_X = spacing.lg;
export const CARD_PADDING_Y = 4;
export const CARD_PADDING_Y_TALL = 6;
export const ROW_HEIGHT = 50;
export const ROW_HEIGHT_TALL = 52;
export const CHEVRON_SIZE = 16;
export const ROW_GAP = spacing.md;

export const SWATCH_SIZE = 26;
export const SWATCH_GAP = 2;
export const SWATCH_RING = 2;
/** Outer size of a selected swatch: swatch + gap + ring on both sides. */
export const SWATCH_OUTER = SWATCH_SIZE + 2 * (SWATCH_GAP + SWATCH_RING);
export const SWATCH_SPACING = 6;

export const rowColors = {
  label: colors.ink,
  value: colors.muted,
  chevron: colors.muted,
  swatchRing: colors.ink,
  swatchGap: colors.sheet,
  swatchBorder: colors.hairline,
} as const;

export const FOOTER_NOTE = 'Ảnh của bạn chỉ nằm trên máy này. Không tài khoản, không máy chủ.';
