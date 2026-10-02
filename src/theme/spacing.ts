/** 4pt spacing scale. */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

export const borderRadius = {
  none: 0,
  print: 3,
  xs: 2,
  sm: 6,
  md: 10,
  lg: 14,
  card: 16,
  cardLarge: 20,
  sheet: 28,
  pill: 999,
} as const;

export const borderWidth = {
  hairline: 1,
  regular: 2,
  thick: 3,
  shutter: 4,
} as const;

/**
 * Polaroid print proportions per format (from the camera design: Instax-like Mini/Square/Wide).
 * `w`/`h` = whole print, `iw`/`ih` = photo window, in the same arbitrary units.
 */
export const printFormats = {
  mini: { w: 54, h: 86, iw: 46, ih: 62 },
  square: { w: 72, h: 86, iw: 62, ih: 62 },
  wide: { w: 108, h: 86, iw: 99, ih: 62 },
} as const;

/** Deterministic tilt set (degrees) for scattered prints; see utils/rotation. */
export const printRotations = [-9, 7, -2, 4, -5, 3] as const;

export const layout = {
  screenGutter: 22,
  /** Edge tab (vertical "BẢN ĐỒ"/"CHỤP" pull tabs): visible width × height, touch width. */
  edgeTabWidth: 26,
  edgeTabHeight: 100,
  edgeTabTouchWidth: 44,
  edgeTabTouchHeight: 112,
  handleWidth: 40,
  handleHeight: 5,
  minTouch: 44,
  iconButtonSize: 44,
  shutterSize: 84,
  dayButtonWidth: 44,
  dayButtonHeight: 66,
  hitSlop: { top: 10, bottom: 10, left: 10, right: 10 },
} as const;
