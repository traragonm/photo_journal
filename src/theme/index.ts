import { Platform, type TextStyle } from 'react-native';

export { colors, type ColorToken } from './colors';
export { typography, fontFamilies, fontSizes, type TypographyToken } from './typography';
export { spacing, borderRadius, borderWidth, printFormats, printRotations, layout } from './spacing';
export { shadows } from './shadows';
export { skyStyles, diaryPalettes, type SkyStyle, type DiaryPalette } from './weather';
export { durations, springs, cardEntry, pressFeedback, easings } from './animations';
export { fontAssets } from './fonts';
export {
  frameColors,
  filmFilters,
  weatherStyles,
  moodStyles,
  type FrameColorStyle,
  type FilmFilterStyle,
  type NoteIcon,
  type NoteStyle,
} from './film';

/**
 * Removes the browser focus ring on web text inputs (captions are written on the print itself).
 * `outlineStyle: 'none'` is web-only CSS that React Native's types don't list, hence the cast.
 */
export const inputReset: TextStyle =
  Platform.OS === 'web' ? ({ outlineWidth: 0, outlineStyle: 'none' } as unknown as TextStyle) : {};
