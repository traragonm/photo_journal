/** Camera that produced the photo. */
export type CameraType = 'back' | 'front';

/** Polaroid print format chosen on the camera's frame knob (Instax Mini / Square / Wide). */
export type FrameType = 'mini' | 'square' | 'wide';

/** Film "look" picked on the camera's inner filter dial. Applied at display time (non-destructive). */
export type FilmFilter = 'original' | 'warm' | 'fade' | 'mono' | 'cool' | 'vintage';

/** Weather noted on the camera's left drum at capture. */
export type Weather = 'sunny' | 'cloudy' | 'rainy' | 'cold';

/** Mood noted on the camera's right drum at capture (also the floating "trạng thái" button). */
export type Mood = 'happy' | 'calm' | 'excited' | 'sad' | 'tired';

/** Sky drawn by the weather effects and theme (finer than `Weather`: snow and storms get their own look). */
export type Sky = 'sun' | 'cloud' | 'rain' | 'snow' | 'storm';

export const FRAME_TYPES: readonly FrameType[] = ['mini', 'square', 'wide'];
export const FILM_FILTERS: readonly FilmFilter[] = ['original', 'warm', 'fade', 'mono', 'cool', 'vintage'];
export const WEATHERS: readonly Weather[] = ['sunny', 'cloudy', 'rainy', 'cold'];
export const MOODS: readonly Mood[] = ['happy', 'calm', 'excited', 'sad', 'tired'];
export const SKIES: readonly Sky[] = ['sun', 'cloud', 'rain', 'snow', 'storm'];

/** Drum choice that matches a sky (storms are rainy, snow is cold). */
export function weatherOfSky(sky: Sky): Weather {
  const map: Record<Sky, Weather> = { sun: 'sunny', cloud: 'cloudy', rain: 'rainy', snow: 'cold', storm: 'rainy' };
  return map[sky];
}

export function toFrameType(value: unknown): FrameType {
  return FRAME_TYPES.includes(value as FrameType) ? (value as FrameType) : 'square';
}

export function toFilmFilter(value: unknown): FilmFilter {
  return FILM_FILTERS.includes(value as FilmFilter) ? (value as FilmFilter) : 'original';
}

/** Stored weather, or null (photos taken before it was recorded, or unknown values). */
export function toWeather(value: unknown): Weather | null {
  return WEATHERS.includes(value as Weather) ? (value as Weather) : null;
}

/** Stored mood, or null (photos taken before it was recorded, or unknown values). */
export function toMood(value: unknown): Mood | null {
  return MOODS.includes(value as Mood) ? (value as Mood) : null;
}

/**
 * A single captured moment. This is the domain model shared by every layer.
 * `imageUri` is always resolved at read time from the stored relative file name,
 * because absolute sandbox paths can change between app installs/updates (iOS).
 */
export interface PhotoEntry {
  id: string;
  imageUri: string;
  /** ISO-8601 UTC timestamp. */
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  caption: string | null;
  cameraType: CameraType;
  frameType: FrameType;
  filter: FilmFilter;
  weather: Weather | null;
  mood: Mood | null;
  width: number | null;
  height: number | null;
  /** False when the image file is missing/unreadable (corrupted storage). */
  isImageAvailable: boolean;
}

/** Input for creating a new entry. The caller owns the id. */
export interface NewPhotoEntry {
  id: string;
  /** Temporary uri of the freshly captured image (camera cache / data URI on web). */
  sourceUri: string;
  createdAt: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  caption: string | null;
  cameraType: CameraType;
  frameType: FrameType;
  filter: FilmFilter;
  weather: Weather | null;
  mood: Mood | null;
  width: number | null;
  height: number | null;
}

/** Fields the user (or background enrichment) may change after capture. */
export type PhotoEntryPatch = Partial<Pick<PhotoEntry, 'caption' | 'locationName'>>;

export const CAPTION_MAX_LENGTH = 120;

export function hasLocation(
  entry: PhotoEntry,
): entry is PhotoEntry & { latitude: number; longitude: number } {
  return entry.latitude !== null && entry.longitude !== null;
}
