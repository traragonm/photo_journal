import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { CameraView, useCameraPermissions, type CameraMountError } from 'expo-camera';
import * as Crypto from 'expo-crypto';
import {
  CAPTION_MAX_LENGTH,
  type AppSettings,
  type CameraType,
  type FilmFilter,
  type FlashMode,
  type FrameType,
  type Mood,
  type PhotoEntry,
  type PhotoEntryPatch,
  type TimerSeconds,
  type Weather,
  type ZoomStop,
} from '@/models';
import { useAppServices } from '@/services/AppServices';
import { createFeedbackService, type FeedbackPreferences } from '@/services/FeedbackService';
import { LocationService, type Coordinates, type LocationPermission } from '@/services/LocationService';
import { openPermissionSettings } from '@/services/openPermissionSettings';
import { useHomeNav } from '@/views/home/HomeNavigator';
import { usePhoto, useSettings } from './shared';
import { useAmbient } from './useAmbient';

/** JPEG quality: visually lossless for a diary, much smaller files than 1.0. */
const CAPTURE_QUALITY = 0.8;
const TOAST_DURATION_MS = 3200;
const COUNTDOWN_TICK_MS = 1000;
/** Keeps a warm GPS fix while the camera is open, so captures rarely wait on GPS. */
const GPS_WARMUP_MS = 20_000;
const DEFAULT_ZOOM: ZoomStop = 1;
const DEFAULT_WEATHER: Weather = 'sunny';

const MESSAGES = {
  captureFailed: 'Kẹt phim rồi! Ảnh chưa lưu được — thử lại nhé.',
  saveFailed: 'Chưa cất được ảnh vào nhật ký. Thử lại nhé.',
  captionFailed: 'Chưa ghi được chú thích — chữ vẫn còn trong ô.',
  cameraError: 'Camera đang trục trặc. Thử mở lại ứng dụng nhé.',
  settingsFailed: 'Chưa nhớ được cài đặt này.',
  saved: 'Đã lưu vào nhật ký',
} as const;

export type CameraPermissionState = 'checking' | 'granted' | 'askable' | 'blocked';

/** The print that is "developing" over the viewfinder after a capture. */
export interface DevelopingPrint {
  id: string;
  createdAt: string;
  frameType: FrameType;
  filter: FilmFilter;
  /** Persisted entry once saved (permanent image uri); undefined while saving. */
  photo: PhotoEntry | undefined;
  /** Temp capture uri, shown until the permanent file exists. */
  previewUri: string;
  caption: string;
  isSavingCaption: boolean;
}

export interface CameraToast {
  id: number;
  message: string;
  tone: 'info' | 'error';
}

export interface CameraViewModel {
  permission: CameraPermissionState;
  /** Mount the native camera only while visible (camera pane active + app in foreground). */
  isCameraActive: boolean;
  isCameraReady: boolean;
  isCapturing: boolean;
  facing: CameraType;
  flashMode: FlashMode;
  timerSeconds: TimerSeconds;
  zoom: ZoomStop;
  frameType: FrameType;
  filter: FilmFilter;
  /** Noted on the next capture (kept for the session, like zoom). */
  weather: Weather;
  mood: Mood;
  /** Increments on every exposure; drives the white flash overlay. */
  flashTrigger: number;
  /** Seconds left on the self-timer, or null when no countdown is running. */
  countdown: number | null;
  showLocationPrompt: boolean;
  developing: DevelopingPrint | null;
  captionMaxLength: number;
  toast: CameraToast | null;
  actions: {
    requestCameraPermission: () => void;
    onCameraReady: () => void;
    onMountError: (event: CameraMountError) => void;
    /** Shutter: captures, starts the self-timer, or cancels a running countdown. */
    pressShutter: () => void;
    toggleFacing: () => void;
    setFlashMode: (mode: FlashMode) => void;
    setTimerSeconds: (seconds: TimerSeconds) => void;
    selectZoom: (zoom: ZoomStop) => void;
    selectFilter: (filter: FilmFilter) => void;
    selectFrameType: (frameType: FrameType) => void;
    selectWeather: (weather: Weather) => void;
    selectMood: (mood: Mood) => void;
    allowLocation: () => void;
    dismissLocationPrompt: () => void;
    setCaption: (text: string) => void;
    finishPrint: () => void;
    dismissPrint: () => void;
    dismissToast: () => void;
  };
}

function useIsAppActive(): boolean {
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state: AppStateStatus) => {
      setIsActive(state === 'active');
    });
    return () => subscription.remove();
  }, []);
  return isActive;
}

/**
 * Camera pane logic.
 * @param cameraRef owned by the View (it renders the CameraView); the ViewModel
 *   only uses it imperatively to take pictures.
 */
export function useCameraViewModel(cameraRef: RefObject<CameraView | null>): CameraViewModel {
  const { photoRepository, settingsRepository } = useAppServices();
  const { settings, updateSettings } = useSettings();
  const nav = useHomeNav();
  const isAppActive = useIsAppActive();
  const [cameraPermission, requestPermission, refreshPermission] = useCameraPermissions();

  const captureLockRef = useRef(false);
  const isMountedRef = useRef(true);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /** Persistence of the latest capture; a caption typed while it is still saving waits for it. */
  const pendingSaveRef = useRef<{ id: string; saved: Promise<boolean> } | null>(null);
  const feedback = useMemo(() => createFeedbackService(), []);

  const [isCameraReady, setIsCameraReady] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [flashTrigger, setFlashTrigger] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [zoom, setZoom] = useState<ZoomStop>(DEFAULT_ZOOM);
  const ambient = useAmbient();
  const [weather, setWeather] = useState<Weather>(ambient.weather ?? DEFAULT_WEATHER);
  const { mood, setMood } = ambient;
  // The drum follows the local forecast (or the sky picked on the diary's weather chip); a
  // manual turn stays until that source changes (adjusting state while rendering, per React docs).
  const [followedWeather, setFollowedWeather] = useState(ambient.weather);
  if (followedWeather !== ambient.weather) {
    setFollowedWeather(ambient.weather);
    if (ambient.weather) setWeather(ambient.weather);
  }
  /** Latest notes for the async capture flow (which outlives the render it started in). */
  const notesRef = useRef({ weather, mood });
  useEffect(() => {
    notesRef.current = { weather, mood };
  }, [weather, mood]);
  const [locationPermission, setLocationPermission] = useState<LocationPermission | null>(null);
  const [developingState, setDevelopingState] = useState<Omit<DevelopingPrint, 'photo'> | null>(null);
  const [toast, setToast] = useState<CameraToast | null>(null);

  const isVisible = nav.isPaneActive('camera') && isAppActive;
  const permission: CameraPermissionState = !cameraPermission
    ? 'checking'
    : cameraPermission.granted
      ? 'granted'
      : cameraPermission.canAskAgain
        ? 'askable'
        : 'blocked';
  const isCameraActive = isVisible && permission === 'granted';

  // Callbacks read the live snapshot so async flows always see the latest settings.
  const currentSettings = useCallback(() => settingsRepository.getSnapshot(), [settingsRepository]);
  const feedbackPreferences = useCallback((): FeedbackPreferences => {
    const { soundEnabled, hapticsEnabled } = currentSettings();
    return { soundEnabled, hapticsEnabled };
  }, [currentSettings]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      feedback.release();
    };
  }, [feedback]);

  // Release the audio player while the camera is not on screen.
  useEffect(() => {
    if (!isVisible) feedback.release();
  }, [isVisible, feedback]);

  // The native preview restarts when re-mounted; wait for its ready event again.
  // (Adjusting state while rendering, per React docs, instead of an effect.)
  const [wasCameraActive, setWasCameraActive] = useState(isCameraActive);
  if (wasCameraActive !== isCameraActive) {
    setWasCameraActive(isCameraActive);
    if (!isCameraActive) setIsCameraReady(false);
  }

  const clearCountdown = useCallback(() => {
    if (countdownTimerRef.current) clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    if (isMountedRef.current) setCountdown(null);
  }, []);

  // A running self-timer stops when the camera leaves the screen (or the pane unmounts).
  useEffect(() => {
    if (!isCameraActive) return;
    return () => clearCountdown();
  }, [isCameraActive, clearCountdown]);

  // Re-check permissions whenever the pane becomes visible (user may have changed them in Settings).
  useEffect(() => {
    if (!isVisible) return;
    let cancelled = false;
    refreshPermission().catch(() => undefined);
    LocationService.getPermission().then((status) => {
      if (!cancelled) setLocationPermission(status);
    });
    return () => {
      cancelled = true;
    };
  }, [isVisible, refreshPermission]);

  // Keep the OS location cache warm while shooting.
  const wantsGps = isCameraActive && settings.locationEnabled && locationPermission === 'granted';
  useEffect(() => {
    if (!wantsGps) return;
    const warm = () => {
      LocationService.getCaptureCoordinates().catch(() => undefined);
    };
    warm();
    const timer = setInterval(warm, GPS_WARMUP_MS);
    return () => clearInterval(timer);
  }, [wantsGps]);

  // Toast auto-hide.
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast]);

  const showToast = useCallback((message: string, tone: CameraToast['tone'] = 'error') => {
    if (isMountedRef.current) setToast({ id: Date.now(), message, tone });
  }, []);

  // The repository serializes writes, so caption + place name never overwrite each other.
  const enqueueUpdate = useCallback(
    (id: string, patch: PhotoEntryPatch): Promise<PhotoEntry> => photoRepository.update(id, patch),
    [photoRepository],
  );

  const enrichPlaceName = useCallback(
    (id: string, coords: Coordinates) => {
      LocationService.getPlaceName(coords)
        .then((locationName) => (locationName ? enqueueUpdate(id, { locationName }) : null))
        .catch((error: unknown) => console.warn('[Camera] place name enrichment failed', error));
    },
    [enqueueUpdate],
  );

  const patchDeveloping = useCallback(
    (id: string, patch: Partial<Pick<DevelopingPrint, 'caption' | 'isSavingCaption'>>) => {
      if (!isMountedRef.current) return;
      setDevelopingState((current) => (current && current.id === id ? { ...current, ...patch } : current));
    },
    [],
  );

  const canCapture = isCameraReady && !developingState;

  /** Exposure + persistence. Guards against double-taps with a lock that covers the exposure only. */
  const takePhoto = useCallback(() => {
    const camera = cameraRef.current;
    if (captureLockRef.current || !camera) return;
    captureLockRef.current = true;
    setIsCapturing(true);

    const captureSettings: AppSettings = currentSettings();
    const id = Crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const { cameraFacing: cameraType, frameType, filter, developEffect } = captureSettings;
    const notes = notesRef.current;

    setFlashTrigger((value) => value + 1);
    feedback.shutter(feedbackPreferences());

    // GPS runs in parallel with the exposure so the shutter never waits on it.
    const coordsPromise: Promise<Coordinates | null> = captureSettings.locationEnabled
      ? LocationService.getCaptureCoordinates()
      : Promise.resolve(null);

    const releaseLock = () => {
      captureLockRef.current = false;
      if (isMountedRef.current) setIsCapturing(false);
    };

    const run = async () => {
      let picture: { uri: string; width: number; height: number };
      try {
        // Our own shutter sound is played above (respecting settings), so the native one is muted.
        picture = await camera.takePictureAsync({ quality: CAPTURE_QUALITY, shutterSound: false });
        if (!picture?.uri) throw new Error('Camera returned no image.');
      } catch (error) {
        console.warn('[Camera] capture failed', error);
        feedback.error(feedbackPreferences());
        showToast(MESSAGES.captureFailed);
        return;
      } finally {
        releaseLock();
      }

      // Show the print immediately; persistence finishes while it develops.
      if (developEffect && isMountedRef.current) {
        setDevelopingState({
          id,
          createdAt,
          frameType,
          filter,
          previewUri: picture.uri,
          caption: '',
          isSavingCaption: false,
        });
      }

      const persist = async (): Promise<boolean> => {
        const coords = await coordsPromise;
        await photoRepository.create({
          id,
          sourceUri: picture.uri,
          createdAt,
          latitude: coords?.latitude ?? null,
          longitude: coords?.longitude ?? null,
          locationName: null,
          caption: null,
          cameraType,
          frameType,
          filter,
          weather: notes.weather,
          mood: notes.mood,
          width: picture.width,
          height: picture.height,
        });
        if (coords && currentSettings().placeNamesEnabled) enrichPlaceName(id, coords);
        return true;
      };

      const saved = persist().catch((error: unknown) => {
        console.warn('[Camera] saving capture failed', error);
        return false;
      });
      pendingSaveRef.current = { id, saved };
      if (await saved) {
        feedback.success(feedbackPreferences());
        if (!developEffect) showToast(MESSAGES.saved, 'info');
      } else {
        // Nothing was stored: take the print away rather than pretend it's in the diary.
        if (isMountedRef.current) {
          setDevelopingState((current) => (current?.id === id ? null : current));
        }
        feedback.error(feedbackPreferences());
        showToast(MESSAGES.saveFailed);
      }
    };

    run().catch((error: unknown) => {
      // Defensive: every step above handles its own errors.
      console.warn('[Camera] unexpected capture error', error);
      releaseLock();
    });
  }, [cameraRef, currentSettings, feedback, feedbackPreferences, photoRepository, enrichPlaceName, showToast]);

  const pressShutter = useCallback(() => {
    if (countdownTimerRef.current) {
      clearCountdown();
      feedback.selection(feedbackPreferences());
      return;
    }
    if (!canCapture || captureLockRef.current) return;
    const seconds = currentSettings().timerSeconds;
    if (seconds === 0) {
      takePhoto();
      return;
    }
    let remaining: number = seconds;
    setCountdown(remaining);
    feedback.selection(feedbackPreferences());
    countdownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        setCountdown(remaining);
        feedback.selection(feedbackPreferences());
        return;
      }
      clearCountdown();
      takePhoto();
    }, COUNTDOWN_TICK_MS);
  }, [canCapture, clearCountdown, currentSettings, feedback, feedbackPreferences, takePhoto]);

  const persistSetting = useCallback(
    (patch: Partial<AppSettings>) => {
      updateSettings(patch).catch((error: unknown) => {
        console.warn('[Camera] settings update failed', error);
        showToast(MESSAGES.settingsFailed);
      });
    },
    [updateSettings, showToast],
  );

  const tick = useCallback(() => feedback.selection(feedbackPreferences()), [feedback, feedbackPreferences]);

  const toggleFacing = useCallback(() => {
    tick();
    persistSetting({ cameraFacing: currentSettings().cameraFacing === 'back' ? 'front' : 'back' });
  }, [tick, persistSetting, currentSettings]);

  const setFlashMode = useCallback(
    (flashMode: FlashMode) => {
      if (flashMode === currentSettings().flashMode) return;
      tick();
      persistSetting({ flashMode });
    },
    [tick, persistSetting, currentSettings],
  );

  const setTimerSeconds = useCallback(
    (timerSeconds: TimerSeconds) => {
      if (timerSeconds === currentSettings().timerSeconds) return;
      tick();
      persistSetting({ timerSeconds });
    },
    [tick, persistSetting, currentSettings],
  );

  const selectZoom = useCallback(
    (next: ZoomStop) => {
      if (next === zoom) return;
      tick();
      setZoom(next);
    },
    [zoom, tick],
  );

  const selectFilter = useCallback(
    (filter: FilmFilter) => {
      if (filter === currentSettings().filter) return;
      tick();
      persistSetting({ filter });
    },
    [tick, persistSetting, currentSettings],
  );

  const selectFrameType = useCallback(
    (frameType: FrameType) => {
      if (frameType === currentSettings().frameType) return;
      tick();
      persistSetting({ frameType });
    },
    [tick, persistSetting, currentSettings],
  );

  const selectWeather = useCallback(
    (next: Weather) => {
      if (next === weather) return;
      tick();
      setWeather(next);
    },
    [weather, tick],
  );

  const selectMood = useCallback(
    (next: Mood) => {
      if (next === mood) return;
      tick();
      setMood(next);
    },
    [mood, tick, setMood],
  );

  const requestCameraPermission = useCallback(() => {
    if (permission === 'blocked') {
      openPermissionSettings('Camera');
      return;
    }
    requestPermission().catch((error: unknown) => console.warn('[Camera] permission request failed', error));
  }, [permission, requestPermission]);

  const allowLocation = useCallback(() => {
    persistSetting({ hasSeenLocationPrompt: true });
    LocationService.requestPermission().then((status) => {
      if (isMountedRef.current) setLocationPermission(status);
    });
  }, [persistSetting]);

  const dismissLocationPrompt = useCallback(() => {
    persistSetting({ hasSeenLocationPrompt: true });
  }, [persistSetting]);

  const setCaption = useCallback((text: string) => {
    setDevelopingState((current) =>
      current ? { ...current, caption: text.slice(0, CAPTION_MAX_LENGTH) } : current,
    );
  }, []);

  const dismissPrint = useCallback(() => setDevelopingState(null), []);

  const finishPrint = useCallback(() => {
    const print = developingState;
    if (!print || print.isSavingCaption) return;
    const caption = print.caption.trim();
    if (caption.length === 0) {
      setDevelopingState(null);
      return;
    }
    patchDeveloping(print.id, { isSavingCaption: true });
    // The entry may still be saving (e.g. waiting on GPS): write the caption once it exists.
    const pending = pendingSaveRef.current;
    const saved = pending?.id === print.id ? pending.saved : Promise.resolve(true);
    saved
      .then((isSaved) => {
        if (!isSaved) return; // capture failed; the print is already gone and the user was told
        return enqueueUpdate(print.id, { caption }).then(() => {
          if (isMountedRef.current) setDevelopingState(null);
        });
      })
      .catch((error: unknown) => {
        console.warn('[Camera] caption save failed', error);
        patchDeveloping(print.id, { isSavingCaption: false });
        showToast(MESSAGES.captionFailed);
      });
  }, [developingState, enqueueUpdate, patchDeveloping, showToast]);

  const onCameraReady = useCallback(() => setIsCameraReady(true), []);
  const onMountError = useCallback(
    (event: CameraMountError) => {
      console.warn('[Camera] mount error', event.message);
      setIsCameraReady(false);
      showToast(MESSAGES.cameraError);
    },
    [showToast],
  );
  const dismissToast = useCallback(() => setToast(null), []);

  const developingPhoto = usePhoto(developingState?.id);
  const developing: DevelopingPrint | null = developingState
    ? { ...developingState, photo: developingPhoto }
    : null;

  const showLocationPrompt =
    isVisible &&
    permission === 'granted' &&
    settings.locationEnabled &&
    !settings.hasSeenLocationPrompt &&
    locationPermission === 'undetermined';

  return {
    permission,
    isCameraActive,
    isCameraReady,
    isCapturing,
    facing: settings.cameraFacing,
    flashMode: settings.flashMode,
    timerSeconds: settings.timerSeconds,
    zoom,
    frameType: settings.frameType,
    filter: settings.filter,
    weather,
    mood,
    flashTrigger,
    countdown,
    showLocationPrompt,
    developing,
    captionMaxLength: CAPTION_MAX_LENGTH,
    toast,
    actions: {
      requestCameraPermission,
      onCameraReady,
      onMountError,
      pressShutter,
      toggleFacing,
      setFlashMode,
      setTimerSeconds,
      selectZoom,
      selectFilter,
      selectFrameType,
      selectWeather,
      selectMood,
      allowLocation,
      dismissLocationPrompt,
      setCaption,
      finishPrint,
      dismissPrint,
      dismissToast,
    },
  };
}
