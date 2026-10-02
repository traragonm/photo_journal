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
export const SWATCH_WIDTH = 44;
export const SWATCH_HEIGHT = 48;
export const SWATCH_SPACING = 4;
export const RING_SIZE = 32;
export const RING_PADDING = 3;
export const CAP_SIZE = 24;
export const CAP_PRESSED_SCALE = 0.9;
export const DOT_SIZE = 5;
export const DOT_GAP = 3;


export const rowColors = {
  label: colors.ink,
  value: colors.muted,
  chevron: colors.muted,
  selectedDot: colors.accent,
} as const;

export const FOOTER_NOTE = 'Ảnh của bạn chỉ nằm trên máy này. Không tài khoản, không máy chủ.';
