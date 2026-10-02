import * as Location from 'expo-location';

export type LocationPermission = 'granted' | 'denied' | 'undetermined';

export interface Coordinates {
  latitude: number;
  longitude: number;
}

/** A recent fix is reused so the shutter never waits on GPS. */
const MAX_LAST_KNOWN_AGE_MS = 2 * 60 * 1000;
const MAX_LAST_KNOWN_ACCURACY_M = 200;
/** Hard cap on waiting for a fresh fix during capture. */
const CURRENT_POSITION_TIMEOUT_MS = 4000;

function toPermission(response: Location.LocationPermissionResponse): LocationPermission {
  if (response.granted) return 'granted';
  return response.status === Location.PermissionStatus.UNDETERMINED ? 'undetermined' : 'denied';
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), ms);
    promise
      .then((value) => resolve(value))
      .catch(() => resolve(null))
      .finally(() => clearTimeout(timer));
  });
}

/**
 * Thin wrapper around expo-location. Every method is failure-tolerant:
 * location is optional, so errors resolve to `null` / 'denied' instead of throwing.
 * Coordinates never leave the device except via the optional OS reverse geocoder.
 */
export const LocationService = {
  async getPermission(): Promise<LocationPermission> {
    try {
      return toPermission(await Location.getForegroundPermissionsAsync());
    } catch {
      return 'denied';
    }
  },

  async requestPermission(): Promise<LocationPermission> {
    try {
      return toPermission(await Location.requestForegroundPermissionsAsync());
    } catch {
      return 'denied';
    }
  },

  /** Whether the OS will show the permission dialog again (false → send user to Settings). */
  async canAskAgain(): Promise<boolean> {
    try {
      return (await Location.getForegroundPermissionsAsync()).canAskAgain;
    } catch {
      return false;
    }
  },

  /**
   * Best-effort position for a capture. Prefers a fresh-enough cached fix,
   * otherwise waits at most CURRENT_POSITION_TIMEOUT_MS. Returns null if
   * permission is missing, services are off, or nothing arrives in time.
   */
  async getCaptureCoordinates(): Promise<Coordinates | null> {
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) return null;
      if (!(await Location.hasServicesEnabledAsync())) return null;

      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: MAX_LAST_KNOWN_AGE_MS,
        requiredAccuracy: MAX_LAST_KNOWN_ACCURACY_M,
      });
      if (lastKnown) return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };

      const current = await withTimeout(
        Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
        CURRENT_POSITION_TIMEOUT_MS,
      );
      return current ? { latitude: current.coords.latitude, longitude: current.coords.longitude } : null;
    } catch {
      return null;
    }
  },

  /**
   * Resolves a short place label ("Hoan Kiem, Hanoi") using the OS geocoder.
   * Only call when the user enabled place names in Settings.
   */
  async getPlaceName(coords: Coordinates): Promise<string | null> {
    try {
      const [address] = await Location.reverseGeocodeAsync(coords);
      if (!address) return null;
      const parts = [address.district ?? address.name, address.city ?? address.subregion ?? address.region]
        .filter((part): part is string => Boolean(part))
        .filter((part, index, all) => all.indexOf(part) === index);
      const label = parts.length > 0 ? parts.join(', ') : address.country;
      return label ?? null;
    } catch {
      return null;
    }
  },
};
