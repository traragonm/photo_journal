import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { FilmFilter, FrameColor, Mood, Weather } from '@/models';
import { colors } from './colors';

export interface FrameColorStyle {
  label: string;
  fill: string;
  ink: string;
  inkSoft: string;
}

/** Polaroid border colours (Settings › Khung ảnh › Màu viền). */
export const frameColors: Record<FrameColor, FrameColorStyle> = {
  white: { label: 'Viền trắng', fill: colors.frameWhite, ink: colors.frameInk, inkSoft: colors.frameInkSoft },
  cream: { label: 'Viền kem', fill: colors.frameCream, ink: colors.frameInk, inkSoft: colors.frameInkSoft },
  black: {
    label: 'Viền đen',
    fill: colors.frameBlack,
    ink: colors.frameInkOnDark,
    inkSoft: colors.frameInkSoftOnDark,
  },
};

export interface FilmFilterStyle {
  /** Vietnamese name shown on the dial readout. */
  label: string;
  /** Dial swatch: one colour, or two halves (black & white). */
  swatch: readonly [string] | readonly [string, string];
  /**
   * CSS-style filter string, applied with the `filter` style prop
   * (web + Android; iOS supports only part of it, so `tint` adds a colour wash there).
   */
  filter: string;
  /** Colour wash overlaid on the image (all platforms; main look on iOS). */
  tint: { color: string; opacity: number } | null;
}

/** Film looks on the camera's inner dial, in dial order (60° apart). Swatch colours are design values. */
export const filmFilters: Record<FilmFilter, FilmFilterStyle> = {
  original: { label: 'Gốc', swatch: ['#9AA3A6'], filter: '', tint: null },
  warm: {
    label: 'Ấm',
    swatch: ['#E2A65F'],
    filter: 'sepia(0.25) saturate(1.35) hue-rotate(-10deg)',
    tint: { color: '#E2A65F', opacity: 0.14 },
  },
  fade: {
    label: 'Phai',
    swatch: ['#CFC5B6'],
    filter: 'contrast(0.8) brightness(1.1) saturate(0.65)',
    tint: { color: '#F4EFE6', opacity: 0.22 },
  },
  mono: {
    label: 'Đen trắng',
    swatch: ['#111111', '#EEEEEE'],
    filter: 'grayscale(1) contrast(1.1)',
    tint: null,
  },
  cool: {
    label: 'Lạnh',
    swatch: ['#6E9AB8'],
    filter: 'hue-rotate(15deg) saturate(1.15) brightness(1.03)',
    tint: { color: '#6E9AB8', opacity: 0.14 },
  },
  vintage: {
    label: 'Hoài cổ',
    swatch: ['#A9805A'],
    filter: 'sepia(0.7) contrast(0.95)',
    tint: { color: '#A9805A', opacity: 0.2 },
  },
};

/** A MaterialCommunityIcons glyph name. */
export type NoteIcon = keyof typeof MaterialCommunityIcons.glyphMap;

export interface NoteStyle {
  /** Vietnamese name shown on the camera drum. */
  label: string;
  icon: NoteIcon;
}

/** Weather options on the camera's left drum, in drum order. */
export const weatherStyles: Record<Weather, NoteStyle> = {
  sunny: { label: 'Nắng', icon: 'weather-sunny' },
  cloudy: { label: 'Mây', icon: 'weather-cloudy' },
  rainy: { label: 'Mưa', icon: 'weather-rainy' },
  cold: { label: 'Lạnh', icon: 'snowflake' },
};

/** Mood options on the camera's right drum, in drum order. */
export const moodStyles: Record<Mood, NoteStyle> = {
  happy: { label: 'Vui', icon: 'emoticon-happy-outline' },
  calm: { label: 'Bình yên', icon: 'emoticon-outline' },
  excited: { label: 'Hào hứng', icon: 'emoticon-excited-outline' },
  sad: { label: 'Buồn', icon: 'emoticon-sad-outline' },
  tired: { label: 'Mệt', icon: 'emoticon-neutral-outline' },
};
