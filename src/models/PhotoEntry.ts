/** Camera that produced the photo. */
export type CameraType = 'back' | 'front';

/** Polaroid print format chosen on the camera's frame knob (Instax Mini / Square / Wide). */
export type FrameType = 'mini' | 'square' | 'wide';

/** Film "look" picked on the camera's inner filter dial. Applied at display time (non-destructive). */
export type FilmFilter = 'original' | 'warm' | 'fade' | 'mono' | 'cool' | 'vintage';

export const FRAME_TYPES: readonly FrameType[] = ['mini', 'square', 'wide'];
export const FILM_FILTERS: readonly FilmFilter[] = ['original', 'warm', 'fade', 'mono', 'cool', 'vintage'];

export function toFrameType(value: unknown): FrameType {
  return FRAME_TYPES.includes(value as FrameType) ? (value as FrameType) : 'square';
}

export function toFilmFilter(value: unknown): FilmFilter {
  return FILM_FILTERS.includes(value as FilmFilter) ? (value as FilmFilter) : 'original';
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
