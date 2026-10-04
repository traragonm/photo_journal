import type { MaterialCommunityIcons } from '@expo/vector-icons';
import type { Sky } from '@/models';
import { colors } from './colors';

export interface SkyStyle {
  /** Vietnamese name ("Nắng"). */
  label: string;
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  /** Page background on the paper screens (library, detail, calendar). */
  page: string;
}

/** The five skies of the weather theme / effects, in the weather chip's order. */
export const skyStyles: Record<Sky, SkyStyle> = {
  sun: { label: 'Nắng', icon: 'weather-sunny', page: colors.skySunPage },
  cloud: { label: 'Mây', icon: 'weather-cloudy', page: colors.skyCloudPage },
  rain: { label: 'Mưa', icon: 'weather-rainy', page: colors.skyRainPage },
  snow: { label: 'Tuyết', icon: 'snowflake', page: colors.skySnowPage },
  storm: { label: 'Giông', icon: 'weather-lightning-rainy', page: colors.skyStormPage },
};

/** The diary page's colours (it is the only page whose ink changes with the sky). */
export interface DiaryPalette {
  page: string;
  ink: string;
  muted: string;
  /** Week-strip day text. */
  day: string;
  future: string;
  todayBg: string;
  todayFg: string;
  chipBg: string;
  chipBorder: string;
  /** Dark page: effects draw with a darker outline. */
  dark: boolean;
}

const PAPER: DiaryPalette = {
  page: colors.paper,
  ink: colors.ink,
  muted: colors.muted,
  day: colors.inkSoft,
  future: colors.faint,
  todayBg: colors.ink,
  todayFg: colors.onInk,
  chipBg: colors.skyChip,
  chipBorder: colors.skyChipBorder,
  dark: false,
};

export const diaryPalettes: Record<Sky | 'paper', DiaryPalette> = {
  paper: PAPER,
  sun: { ...PAPER, page: colors.skySunPage },
  cloud: { ...PAPER, page: colors.skyCloudPage, muted: colors.skyCloudMuted, future: colors.skyCloudFuture },
  rain: {
    ...PAPER,
    page: colors.skyRainPage,
    ink: colors.skyRainInk,
    muted: colors.skyRainMuted,
    day: colors.skyRainDay,
    future: colors.skyRainFuture,
    todayBg: colors.skyRainInk,
  },
  snow: {
    ...PAPER,
    page: colors.skySnowPage,
    ink: colors.skySnowInk,
    muted: colors.skySnowMuted,
    day: colors.skySnowDay,
    future: colors.skySnowFuture,
    todayBg: colors.skySnowInk,
  },
  storm: {
    page: colors.skyStormDiary,
    ink: colors.skyStormInk,
    muted: colors.skyStormMuted,
    day: colors.skyStormDay,
    future: colors.skyStormFuture,
    todayBg: colors.skyStormInk,
    todayFg: colors.ink,
    chipBg: colors.skyChipDark,
    chipBorder: colors.skyChipBorderDark,
    dark: true,
  },
};
