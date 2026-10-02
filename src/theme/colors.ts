/**
 * Color tokens — "Nhật ký ảnh Polaroid" design (warm paper, ink, one brick-red accent).
 * Never hard-code hex values outside this file.
 */
const palette = {
  // Paper & surfaces
  paper: '#ECE6DB',
  sheet: '#F7F3EC',
  card: '#FFFFFF',
  chip: '#EFE9DF',
  chipPressed: '#EFE6D8',
  handle: '#B9AFA2',
  hairline: '#CFC6BA',

  // Ink
  ink: '#26221E',
  inkStrong: '#000000',
  inkSoft: '#4A433C',
  muted: '#6B6258',
  faint: '#A0968A',
  onInk: '#F4EFE6',
  onInkMuted: '#C9C0B4',

  // Accent (brick red). accentText is darker for 4.5:1 text contrast on light paper.
  accent: '#C2402A',
  accentText: '#A8361F',
  danger: '#B3261E',

  // Polaroid print borders (Settings › Màu viền) + their ink
  frameWhite: '#FBFAF6',
  frameCream: '#F2E6CF',
  frameBlack: '#1E1C1A',
  frameInk: '#2E2A26',
  frameInkSoft: '#7A7066',
  frameInkOnDark: '#F4EFE6',
  frameInkSoftOnDark: '#C9C0B4',
  undevelopedFilm: '#2B2622',

  // Camera body
  cameraBody: '#171513',
  cameraDialFace: '#1F1C19',
  cameraDialCream: '#E9E1D2',
  cameraKnurlLight: '#4A433C',
  cameraKnurlDark: '#2A2622',
  cameraKnob: '#D9CFBF',
  cameraBrass: '#8A7A5C',
  cameraTick: '#6B6258',
  cameraTickDark: '#5A524A',
  cameraLabel: '#B5ACA0',
  cameraLabelIdle: '#8E857A',
  cameraButton: 'rgba(255,255,255,0.09)',
  cameraBadge: 'rgba(0,0,0,0.55)',
  // Camera slide switches (flash / timer) + LEDs
  cameraSwitchIcon: '#D8D0C4',
  cameraSwitchTrack: '#0E0D0C',
  cameraSwitchTrackLight: '#1F1C19',
  cameraSwitchTrackBorder: '#3A3530',
  cameraSwitchTrackShadow: 'rgba(0,0,0,0.8)',
  cameraSwitchKnurlLight: '#E2D9CA',
  cameraSwitchKnurlDark: '#A99F92',
  cameraSwitchThumbShadow: 'rgba(0,0,0,0.6)',
  cameraSwitchThumbShadowLight: 'rgba(0,0,0,0.45)',
  cameraSwitchThumbHighlight: 'rgba(255,255,255,0.5)',
  cameraSwitchThumbHighlightLight: 'rgba(255,255,255,0.6)',
  cameraLedOn: '#F2B441',
  cameraLedAuto: '#8A6A2A',
  cameraLedOff: '#3A3530',

  // Settings hardware switches (toggle LED, border-colour knurled ring)
  switchLedOn: '#E0892E',
  switchLedGlow: 'rgba(224,137,46,0.8)',
  knurlRingLight: '#8A8178',
  knurlRingDark: '#5E574F',
  ringShadow: 'rgba(0,0,0,0.3)',
  capShadowPressed: 'rgba(0,0,0,0.45)',
  capShadowRaised: 'rgba(0,0,0,0.3)',

  // Map (paper-toned cartography)
  mapLand: '#E7E1D4',
  mapWater: '#B9CBD1',
  mapPark: '#C9D4B4',
  mapRoad: '#FBF8F2',
  mapRoadMinor: '#F3EEE5',
  mapLabelWater: '#4F6A74',
  mapLabelPark: '#56663F',
  userLocation: '#2F6FB0',
  userLocationHalo: 'rgba(47,111,176,0.18)',

  // Detail screen: film date stamp + film-strip info bar
  filmStamp: '#FF8A3D',
  filmStampGlow: 'rgba(255,120,40,0.7)',
  filmStripText: '#F2A65A',

  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  flash: '#FFFFFF',
  scrim: 'rgba(38,34,30,0.35)',
  shadow: '#46301A',
} as const;

export const colors = {
  ...palette,
  // Semantic aliases
  background: palette.paper,
  surface: palette.card,
  text: palette.ink,
  textSecondary: palette.inkSoft,
  textMuted: palette.muted,
  textFaint: palette.faint,
  border: palette.hairline,
  divider: palette.chip,
} as const;

export type ColorToken = keyof typeof colors;
