import type { ReminderPermission } from './reminderTime';

export type { ReminderPermission } from './reminderTime';

/** Web twin of ReminderService: browsers cannot schedule local daily notifications, so it is inert. */
export const ReminderService = {
  isSupported: false,

  async getPermission(): Promise<ReminderPermission> {
    return 'blocked';
  },

  async ensurePermission(): Promise<ReminderPermission> {
    return 'blocked';
  },

  async schedule(_time: string): Promise<void> {
    // Unsupported on web.
  },

  async cancel(): Promise<void> {
    // Nothing was scheduled.
  },

  openSettings(): void {
    // Nothing to open.
  },
};
