import type { AppLockSupport, AuthOutcome } from './appLockTypes';

export type { AppLockSupport, AuthOutcome } from './appLockTypes';

/** Web twin of AppLockService: there is no trustworthy device lock in a browser, so the app never locks. */
export const AppLockService = {
  isPlatformSupported: false,

  async getSupport(): Promise<AppLockSupport> {
    return 'unsupported';
  },

  async authenticate(_promptMessage: string): Promise<AuthOutcome> {
    return 'unavailable';
  },
};
