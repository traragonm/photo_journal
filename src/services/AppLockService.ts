import * as LocalAuthentication from 'expo-local-authentication';
import type { AppLockSupport, AuthOutcome } from './appLockTypes';

export type { AppLockSupport, AuthOutcome } from './appLockTypes';

const CANCEL_LABEL = 'Huỷ';
const FALLBACK_LABEL = 'Dùng mật mã';
/** Errors meaning the device can no longer authenticate at all (biometrics + passcode removed). */
const UNAVAILABLE_ERRORS: readonly string[] = ['not_available', 'not_enrolled', 'passcode_not_set'];

/** Biometric / device-passcode authentication for the app lock. Never throws. */
export const AppLockService = {
  /** False on web: the app is never locked there. */
  isPlatformSupported: true,

  async getSupport(): Promise<AppLockSupport> {
    try {
      if (!(await LocalAuthentication.hasHardwareAsync())) return 'unsupported';
      return (await LocalAuthentication.isEnrolledAsync()) ? 'available' : 'not_enrolled';
    } catch {
      return 'unsupported';
    }
  },

  /** Device passcode fallback is allowed. 'unavailable' = nothing left to authenticate with. */
  async authenticate(promptMessage: string): Promise<AuthOutcome> {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage,
        cancelLabel: CANCEL_LABEL,
        fallbackLabel: FALLBACK_LABEL,
        disableDeviceFallback: false,
      });
      if (result.success) return 'success';
      return UNAVAILABLE_ERRORS.includes(result.error) ? 'unavailable' : 'failed';
    } catch {
      return 'failed';
    }
  },
};
