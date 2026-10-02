/** 'unsupported' = no biometric hardware; 'not_enrolled' = hardware but no face / fingerprint set up. */
export type AppLockSupport = 'available' | 'not_enrolled' | 'unsupported';

/** 'failed' = cancelled / wrong; 'unavailable' = the device has no way left to authenticate. */
export type AuthOutcome = 'success' | 'failed' | 'unavailable';
