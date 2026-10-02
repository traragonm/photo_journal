const COORDINATE_DECIMALS = 4;

/** "21.0285° N" */
export function formatLatitude(latitude: number): string {
  const hemisphere = latitude >= 0 ? 'N' : 'S';
  return `${Math.abs(latitude).toFixed(COORDINATE_DECIMALS)}° ${hemisphere}`;
}

/** "105.8542° E" */
export function formatLongitude(longitude: number): string {
  const hemisphere = longitude >= 0 ? 'E' : 'W';
  return `${Math.abs(longitude).toFixed(COORDINATE_DECIMALS)}° ${hemisphere}`;
}

/** Human label for where a photo was taken; falls back to coordinates. */
export function formatPlace(
  locationName: string | null,
  latitude: number | null,
  longitude: number | null,
): string | null {
  if (locationName) return locationName;
  if (latitude === null || longitude === null) return null;
  return `${formatLatitude(latitude)}  ${formatLongitude(longitude)}`;
}
