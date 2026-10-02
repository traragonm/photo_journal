import type { ViewStyle } from 'react-native';
import { colors } from './colors';

/** Cross-platform shadow presets (iOS shadow* + Android elevation). Warm brown, soft. */
export const shadows = {
  none: {},
  /** Small thumbnails / chips */
  soft: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 2,
  },
  /** A Polaroid lying on the table */
  print: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.2,
    shadowRadius: 13,
    elevation: 6,
  },
  /** The top print of a pile */
  printLifted: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 18 },
    shadowOpacity: 0.26,
    shadowRadius: 17,
    elevation: 10,
  },
  /** Floating pill controls on the map */
  float: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 7,
    elevation: 4,
  },
  /** Sheets sliding over the page (calendar from below, settings from above) */
  sheet: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.16,
    shadowRadius: 15,
    elevation: 16,
  },
  sheetFromTop: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 15,
    elevation: 16,
  },
  /** The camera viewfinder print */
  viewfinder: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 20 },
    shadowOpacity: 0.5,
    shadowRadius: 25,
    elevation: 14,
  },
} as const satisfies Record<string, ViewStyle>;
