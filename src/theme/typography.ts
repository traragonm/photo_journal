import type { TextStyle } from 'react-native';

/**
 * Font families (loaded in the root layout via `fontAssets`).
 * - Be Vietnam Pro: all UI text (full Vietnamese diacritics).
 * - Patrick Hand: handwritten captions / notes on prints.
 */
export const fontFamilies = {
  regular: 'BeVietnamPro_400Regular',
  medium: 'BeVietnamPro_500Medium',
  semibold: 'BeVietnamPro_600SemiBold',
  bold: 'BeVietnamPro_700Bold',
  hand: 'PatrickHand_400Regular',
  /** LCD film date stamp */
  lcd: 'VT323_400Regular',
} as const;

export const fontSizes = {
  micro: 10,
  xs: 11,
  sm: 12,
  md: 13,
  base: 15,
  lg: 16,
  xl: 20,
  xxl: 24,
  title: 30,
  display: 32,
} as const;

/** Reusable text presets. Prefer these over ad-hoc styles. */
export const typography = {
  /** "Hôm nay" */
  display: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.display, letterSpacing: -0.3 },
  /** "Cài đặt" */
  title: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.title, letterSpacing: -0.3 },
  /** "Tháng 10, 2026" */
  heading: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.xxl },
  /** "Hôm nay đã đi qua" */
  subheading: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.xl },
  /** Card titles ("Thứ Sáu, 2 tháng 10") */
  cardTitle: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.lg },
  body: { fontFamily: fontFamilies.regular, fontSize: fontSizes.base, lineHeight: 22 },
  bodyMedium: { fontFamily: fontFamilies.medium, fontSize: fontSizes.base },
  /** Links / chip labels */
  label: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.md },
  caption: { fontFamily: fontFamilies.regular, fontSize: fontSizes.sm, lineHeight: 17 },
  /** "THỨ SÁU, 2 THÁNG 10", section headers */
  eyebrow: {
    fontFamily: fontFamilies.semibold,
    fontSize: fontSizes.sm,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  /** Vertical edge-tab labels ("BẢN ĐỒ") */
  tab: { fontFamily: fontFamilies.semibold, fontSize: fontSizes.micro, letterSpacing: 0.8 },
  /** Handwritten caption on a print */
  hand: { fontFamily: fontFamilies.hand, fontSize: 19, lineHeight: 21 },
  handLarge: { fontFamily: fontFamilies.hand, fontSize: 22, lineHeight: 25 },
  /** Detail print: title and note under the photo */
  handTitle: { fontFamily: fontFamilies.hand, fontSize: 27, lineHeight: 28 },
  handNote: { fontFamily: fontFamilies.hand, fontSize: 17, lineHeight: 20 },
  /** Film date stamp (LCD font) */
  lcd: { fontFamily: fontFamilies.lcd, fontSize: 20 },
  handSmall: { fontFamily: fontFamilies.hand, fontSize: 14, lineHeight: 16 },
} as const satisfies Record<string, TextStyle>;

export type TypographyToken = keyof typeof typography;
