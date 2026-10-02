import { Dialog } from './Dialog';

/** Browsers can't open a settings page programmatically, so explain where to look. */
export function openPermissionSettings(permission: 'Camera' | 'Location'): void {
  Dialog.notify(
    `${permission} is blocked`,
    `Allow ${permission.toLowerCase()} for this site from your browser's site settings (the icon next to the address bar), then reload.`,
  );
}
