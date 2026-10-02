import { Linking } from 'react-native';

/** Opens the OS settings page for this app so the user can re-enable a blocked permission. */
export function openPermissionSettings(_permission: 'Camera' | 'Location'): void {
  Linking.openSettings().catch(() => undefined);
}
