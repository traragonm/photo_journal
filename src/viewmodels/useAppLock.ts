import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { AppLockService } from '@/services/AppLockService';
import { Dialog } from '@/services/Dialog';
import { useSettings } from './shared';

/** Returning from the background after longer than this shows the lock screen again. */
export const LOCK_AFTER_BACKGROUND_MS = 30_000;
export const UNLOCK_PROMPT = 'Mở khoá nhật ký';

export interface AppLock {
  locked: boolean;
  /** True while the system prompt is on screen. */
  authenticating: boolean;
  /** Shown under the button after a failed / cancelled attempt. */
  failed: boolean;
  unlock: () => void;
}

/**
 * App lock state. Locks on cold start and after > LOCK_AFTER_BACKGROUND_MS in the background when
 * Settings › app lock is on. Never locks on web (AppLockService.isPlatformSupported is false).
 */
export function useAppLock(): AppLock {
  const { settings, updateSettings } = useSettings();
  const enabled = settings.appLockEnabled && AppLockService.isPlatformSupported;
  const [locked, setLocked] = useState(enabled);
  const [authenticating, setAuthenticating] = useState(false);
  const [failed, setFailed] = useState(false);
  const authenticatingRef = useRef(false);
  const backgroundedAt = useRef<number | null>(null);

  const unlock = useCallback(() => {
    if (authenticatingRef.current) return;
    authenticatingRef.current = true;
    setAuthenticating(true);
    setFailed(false);
    AppLockService.authenticate(UNLOCK_PROMPT)
      .then((outcome) => {
        if (outcome === 'success') {
          setLocked(false);
        } else if (outcome === 'unavailable') {
          // Fail open: with no biometrics or passcode left the user would be locked out of their own diary.
          setLocked(false);
          updateSettings({ appLockEnabled: false }).catch(() => undefined);
          Dialog.notify(
            'Đã tắt khoá app',
            'Thiết bị không còn Face ID / vân tay hoặc mật mã nên không thể khoá nhật ký. Bạn có thể bật lại trong Cài đặt.',
          );
        } else {
          setFailed(true);
        }
      })
      .finally(() => {
        authenticatingRef.current = false;
        setAuthenticating(false);
      });
  }, [updateSettings]);

  // Turning the setting off unlocks; turning it on mid-session does not lock until the next background trip.
  if (!enabled && locked) setLocked(false);

  useEffect(() => {
    if (!enabled) return undefined;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'background') {
        // 'inactive' is ignored: the iOS biometric prompt itself causes it.
        if (!authenticatingRef.current) backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        const since = backgroundedAt.current;
        backgroundedAt.current = null;
        if (since !== null && Date.now() - since > LOCK_AFTER_BACKGROUND_MS) setLocked(true);
      }
    });
    return () => subscription.remove();
  }, [enabled]);

  // Ask for the face / fingerprint as soon as the lock appears (the button stays for retries).
  useEffect(() => {
    if (locked && enabled && AppState.currentState === 'active') unlock();
    // `unlock` is stable per updateSettings; run only when the lock engages.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locked, enabled]);

  return { locked: locked && enabled, authenticating, failed, unlock };
}
