import type { Sky, Weather } from '@/models';
import type { Coordinates } from './LocationService';

/** Open-Meteo: free, no API key, no account. Only rounded coordinates are sent. */
const ENDPOINT = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 6000;
/** 2 decimals ≈ 1 km: plenty for local weather, less precise than the photo's GPS. */
const COORD_DECIMALS = 2;
/** At or below this (°C) the drum reads "Lạnh" whatever the sky does — unless it rains. */
export const COLD_THRESHOLD_C = 15;

// WMO weather interpretation codes (https://open-meteo.com/en/docs).
const CLOUDY_CODES = new Set([2, 3, 45, 48]);
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const STORM_CODES = new Set([95, 96, 99]);

export interface WeatherConditions {
  /** Drum choice saved with photos. */
  weather: Weather;
  /** Look of the weather effects / theme. */
  sky: Sky;
  temperatureC: number | null;
}

/** Maps a WMO code to the sky the effects draw. */
export function skyFromCode(code: number): Sky {
  if (STORM_CODES.has(code)) return 'storm';
  if (RAIN_CODES.has(code)) return 'rain';
  if (SNOW_CODES.has(code)) return 'snow';
  if (CLOUDY_CODES.has(code)) return 'cloud';
  return 'sun';
}

/** Maps a WMO code + temperature to one of the four drum choices. Rain wins, then cold, then clouds. */
export function weatherFromConditions(code: number, temperatureC: number | null): Weather {
  if (RAIN_CODES.has(code)) return 'rainy';
  if (SNOW_CODES.has(code)) return 'cold';
  if (temperatureC !== null && temperatureC <= COLD_THRESHOLD_C) return 'cold';
  if (CLOUDY_CODES.has(code)) return 'cloudy';
  return 'sunny';
}

export function weatherRequestUrl({ latitude, longitude }: Coordinates): string {
  const params = [
    `latitude=${latitude.toFixed(COORD_DECIMALS)}`,
    `longitude=${longitude.toFixed(COORD_DECIMALS)}`,
    'current=weather_code,temperature_2m',
    'timezone=auto',
  ];
  return `${ENDPOINT}?${params.join('&')}`;
}

interface OpenMeteoResponse {
  current?: { weather_code?: unknown; temperature_2m?: unknown };
}

/**
 * Current local weather. Failure-tolerant like LocationService: offline, timeouts and odd
 * responses resolve to `null` (the camera then keeps whatever the drum shows).
 */
export const WeatherService = {
  async getCurrentConditions(coords: Coordinates): Promise<WeatherConditions | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch(weatherRequestUrl(coords), { signal: controller.signal });
      if (!response.ok) return null;
      const body = (await response.json()) as OpenMeteoResponse;
      const code = body.current?.weather_code;
      const temperature = body.current?.temperature_2m;
      if (typeof code !== 'number') return null;
      const temperatureC = typeof temperature === 'number' ? temperature : null;
      return { weather: weatherFromConditions(code, temperatureC), sky: skyFromCode(code), temperatureC };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  },
};
