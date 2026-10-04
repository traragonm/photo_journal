import { toFilmFilter, toFrameType, type CameraType, type FilmFilter, type FrameType } from './PhotoEntry';

export type FlashMode = 'off' | 'on' | 'auto';

/** Polaroid border colour (Settings › Khung ảnh › Màu viền). */
export type FrameColor = 'white' | 'cream' | 'black';

/** Self-timer before the shutter fires, in seconds (0 = off). */
export type TimerSeconds = 0 | 3 | 10;

/** Zoom stops on the camera's zoom ruler. */
export type ZoomStop = 0.5 | 1 | 1.5 | 2 | 3 | 4 | 5;

export interface AppSettings {
  /** User wants GPS attached to new photos (still subject to OS permission). */
  locationEnabled: boolean;
  /**
   * Resolve coordinates to a place name using the OS geocoder.
   * Off by default: the system geocoder may contact Apple/Google servers.
   */
  placeNamesEnabled: boolean;
  /**
   * Fill the camera's weather drum from the local forecast (Open-Meteo, rounded coordinates).
   * Needs location; the user can still turn the drum by hand.
   */
  autoWeatherEnabled: boolean;
  /** "Hiệu ứng thời tiết" — animated sun / clouds / rain / snow over the pages. */
  weatherEffectsEnabled: boolean;
  /** "Màu giao diện theo thời tiết" — page colours follow the sky. */
  weatherThemeEnabled: boolean;
  soundEnabled: boolean;
  hapticsEnabled: boolean;
  flashMode: FlashMode;
  cameraFacing: CameraType;
  timerSeconds: TimerSeconds;
  /** Default print format (camera knob starts here). */
  frameType: FrameType;
  /** Last-used film filter (camera dial starts here). */
  filter: FilmFilter;
  frameColor: FrameColor;
  /** "Hiệu ứng ảnh hiện dần" — play the Polaroid develop animation after capture. */
  developEffect: boolean;
  /** "Ghi chú kiểu chữ viết tay" — captions in the handwritten font. */
  handwriting: boolean;
  /** Daily local reminder to take a photo. */
  reminderEnabled: boolean;
  /** "HH:MM", local time. */
  reminderTime: string;
  /** Require Face ID / fingerprint / device passcode when opening the app. */
  appLockEnabled: boolean;
  /** Whether we've already shown the optional location prompt once. */
  hasSeenLocationPrompt: boolean;
}

const oneOf = <T>(value: T, allowed: readonly T[], fallback: T): T =>
  allowed.includes(value) ? value : fallback;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Clamps enum-like fields back to valid values (storage may hold stale/corrupted data). */
export function sanitizeSettings(settings: AppSettings): AppSettings {
  return {
    ...settings,
    flashMode: oneOf(settings.flashMode, ['off', 'on', 'auto'], DEFAULT_SETTINGS.flashMode),
    cameraFacing: oneOf(settings.cameraFacing, ['back', 'front'], DEFAULT_SETTINGS.cameraFacing),
    timerSeconds: oneOf(settings.timerSeconds, [0, 3, 10], DEFAULT_SETTINGS.timerSeconds),
    frameType: toFrameType(settings.frameType),
    filter: toFilmFilter(settings.filter),
    frameColor: oneOf(settings.frameColor, ['white', 'cream', 'black'], DEFAULT_SETTINGS.frameColor),
    reminderTime: TIME_PATTERN.test(settings.reminderTime) ? settings.reminderTime : DEFAULT_SETTINGS.reminderTime,
  };
}

export const DEFAULT_SETTINGS: AppSettings = {
  locationEnabled: true,
  placeNamesEnabled: false,
  autoWeatherEnabled: true,
  weatherEffectsEnabled: true,
  weatherThemeEnabled: true,
  soundEnabled: true,
  hapticsEnabled: true,
  flashMode: 'auto',
  cameraFacing: 'back',
  timerSeconds: 0,
  frameType: 'square',
  filter: 'original',
  frameColor: 'white',
  developEffect: true,
  handwriting: true,
  reminderEnabled: false,
  reminderTime: '20:00',
  appLockEnabled: false,
  hasSeenLocationPrompt: false,
};
