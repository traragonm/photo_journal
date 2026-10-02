import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import type { AppSettings } from '@/models';

/** The subset of settings that controls sensory feedback. */
export type FeedbackPreferences = Pick<AppSettings, 'soundEnabled' | 'hapticsEnabled'>;

export interface FeedbackService {
  /** Mechanical shutter: click sound + firm haptic. */
  shutter(preferences: FeedbackPreferences): void;
  /** Light tick for toggles (flash, flip camera). */
  selection(preferences: FeedbackPreferences): void;
  /** A memory was saved. */
  success(preferences: FeedbackPreferences): void;
  /** Something went wrong (capture failed, …). */
  error(preferences: FeedbackPreferences): void;
  /** Releases the native audio player. The service can still be used afterwards (it re-creates lazily). */
  release(): void;
}

 
const SHUTTER_SOUND = require('../../assets/sounds/shutter.wav') as number;
const SHUTTER_VOLUME = 0.8;
const START_POSITION_S = 0;

function ignore(): void {
  // Feedback is best-effort: a missing vibrator or audio session never breaks a capture.
}

/**
 * Sound + haptics for the camera. Every call is fire-and-forget and failure-tolerant.
 * The audio player is created lazily on first use (so it costs nothing when sound is off)
 * and mixes with other audio while respecting the device's silent switch.
 */
export function createFeedbackService(): FeedbackService {
  let player: AudioPlayer | null = null;
  let audioModeConfigured = false;

  function getPlayer(): AudioPlayer | null {
    if (player) return player;
    try {
      if (!audioModeConfigured) {
        audioModeConfigured = true;
        setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(ignore);
      }
      player = createAudioPlayer(SHUTTER_SOUND);
      player.volume = SHUTTER_VOLUME;
    } catch (error) {
      console.warn('[FeedbackService] audio unavailable', error);
      player = null;
    }
    return player;
  }

  function haptic(preferences: FeedbackPreferences, run: () => Promise<void>): void {
    if (!preferences.hapticsEnabled) return;
    try {
      run().catch(ignore);
    } catch {
      ignore();
    }
  }

  return {
    shutter(preferences) {
      if (preferences.soundEnabled) {
        const shutterPlayer = getPlayer();
        if (shutterPlayer) {
          try {
            shutterPlayer.seekTo(START_POSITION_S).catch(ignore);
            shutterPlayer.play();
          } catch {
            ignore();
          }
        }
      }
      haptic(preferences, () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Rigid));
    },
    selection(preferences) {
      haptic(preferences, () => Haptics.selectionAsync());
    },
    success(preferences) {
      haptic(preferences, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
    },
    error(preferences) {
      haptic(preferences, () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
    },
    release() {
      try {
        player?.remove();
      } catch {
        ignore();
      }
      player = null;
    },
  };
}
