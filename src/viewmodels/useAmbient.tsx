import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { SKIES, weatherOfSky, type Mood, type Sky, type Weather } from '@/models';
import { LocationService } from '@/services/LocationService';
import { WeatherService, type WeatherConditions } from '@/services/WeatherService';
import { diaryPalettes, skyStyles, type DiaryPalette } from '@/theme';
import { useSettings } from './shared';

/** The forecast is re-fetched at most this often while the app is in the foreground. */
const WEATHER_REFRESH_MS = 15 * 60_000;
const DEFAULT_MOOD: Mood = 'happy';

export interface Ambient {
  /** Sky shown by the weather theme / effects: the user's pick, else the forecast, else unknown. */
  sky: Sky | null;
  /** Forecast temperature; null when unknown or when the user picked another sky. */
  temperatureC: number | null;
  /** Weather the camera drum should show (forecast or picked sky), or null when unknown. */
  weather: Weather | null;
  /** Current "trạng thái": shared by the floating mood button and the camera's mood drum. */
  mood: Mood;
  /** Page colours follow the sky (Settings › Màu giao diện theo thời tiết). */
  themeEnabled: boolean;
  /** Animated sun / clouds / rain / snow (Settings › Hiệu ứng thời tiết). */
  effectsEnabled: boolean;
  setMood: (mood: Mood) => void;
  /** Weather chip: step to the next sky (back to the forecast when it comes round). */
  cycleSky: () => void;
}

const AmbientContext = createContext<Ambient | null>(null);

/** Keeps the local forecast fresh (when allowed) and holds the session's sky pick and mood. */
export function AmbientProvider({ children }: { children: ReactNode }) {
  const { settings } = useSettings();
  const [forecast, setForecast] = useState<WeatherConditions | null>(null);
  const [skyOverride, setSkyOverride] = useState<Sky | null>(null);
  const [mood, setMood] = useState<Mood>(DEFAULT_MOOD);
  const fetchedAtRef = useRef(0);

  const wantsForecast = settings.autoWeatherEnabled && settings.locationEnabled;

  useEffect(() => {
    if (!wantsForecast) return;
    let cancelled = false;
    const refresh = async () => {
      if (AppState.currentState !== 'active') return;
      if (Date.now() - fetchedAtRef.current < WEATHER_REFRESH_MS) return;
      if ((await LocationService.getPermission()) !== 'granted') return;
      const coords = await LocationService.getCaptureCoordinates();
      if (!coords || cancelled) return;
      const next = await WeatherService.getCurrentConditions(coords);
      if (!next || cancelled) return;
      fetchedAtRef.current = Date.now();
      setForecast(next);
    };
    refresh();
    const timer = setInterval(refresh, WEATHER_REFRESH_MS);
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') refresh();
    });
    return () => {
      cancelled = true;
      clearInterval(timer);
      subscription.remove();
      fetchedAtRef.current = 0; // turned off: fetch again as soon as it is turned back on
    };
  }, [wantsForecast]);

  // Turning the forecast off forgets it (adjusting state while rendering, per React docs).
  const [hadForecast, setHadForecast] = useState(wantsForecast);
  if (hadForecast !== wantsForecast) {
    setHadForecast(wantsForecast);
    if (!wantsForecast) setForecast(null);
  }

  const liveForecast = wantsForecast ? forecast : null;
  const sky = skyOverride ?? liveForecast?.sky ?? null;

  const cycleSky = useCallback(() => {
    const next = SKIES[(sky === null ? 0 : SKIES.indexOf(sky) + 1) % SKIES.length];
    setSkyOverride(next === liveForecast?.sky ? null : next);
  }, [sky, liveForecast?.sky]);

  const value = useMemo<Ambient>(
    () => ({
      sky,
      temperatureC: skyOverride === null ? (liveForecast?.temperatureC ?? null) : null,
      weather: skyOverride !== null ? weatherOfSky(skyOverride) : (liveForecast?.weather ?? null),
      mood,
      themeEnabled: settings.weatherThemeEnabled,
      effectsEnabled: settings.weatherEffectsEnabled,
      setMood,
      cycleSky,
    }),
    [sky, skyOverride, liveForecast, mood, settings.weatherThemeEnabled, settings.weatherEffectsEnabled, cycleSky],
  );

  return <AmbientContext.Provider value={value}>{children}</AmbientContext.Provider>;
}

export function useAmbient(): Ambient {
  const value = useContext(AmbientContext);
  if (!value) throw new Error('useAmbient must be used inside <AmbientProvider>.');
  return value;
}

export interface WeatherLook {
  /** Sky the effects should draw (null: none, or effects turned off). */
  effectsSky: Sky | null;
  /** Page background for the paper screens, or null to keep their normal colour. */
  page: string | null;
  /** Diary page colours (paper when the theme is off or the sky is unknown). */
  diary: DiaryPalette;
}

/** How pages should look for the current sky, honouring the two weather settings. */
export function useWeatherLook(): WeatherLook {
  const { sky, themeEnabled, effectsEnabled } = useAmbient();
  const themed = themeEnabled ? sky : null;
  return {
    effectsSky: effectsEnabled ? sky : null,
    page: themed ? skyStyles[themed].page : null,
    diary: diaryPalettes[themed ?? 'paper'],
  };
}
