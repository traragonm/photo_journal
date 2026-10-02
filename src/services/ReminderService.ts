import { Linking, Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { parseReminderTime, type ReminderPermission } from './reminderTime';

export type { ReminderPermission } from './reminderTime';

const REMINDER_ID = 'daily-photo-reminder';
const ANDROID_CHANNEL_ID = 'daily-reminder';
const ANDROID_CHANNEL_NAME = 'Nhắc chụp mỗi ngày';
const REMINDER_TITLE = 'Hôm nay bạn đã chụp gì chưa?';
const REMINDER_BODY = 'Ghi lại một khoảnh khắc nhỏ cho nhật ký nhé.';

/**
 * Daily local notification ("Nhắc chụp mỗi ngày"). Entirely on-device: no push token, no server.
 * `ReminderService.web.ts` is a no-op twin because browsers cannot schedule local notifications.
 */
export const ReminderService = {
  isSupported: true,

  async getPermission(): Promise<ReminderPermission> {
    try {
      const response = await Notifications.getPermissionsAsync();
      if (response.granted) return 'granted';
      return response.canAskAgain ? 'denied' : 'blocked';
    } catch {
      return 'denied';
    }
  },

  /** Asks for permission if the OS still allows it. */
  async ensurePermission(): Promise<ReminderPermission> {
    try {
      const current = await Notifications.getPermissionsAsync();
      if (current.granted) return 'granted';
      if (!current.canAskAgain) return 'blocked';
      const requested = await Notifications.requestPermissionsAsync();
      if (requested.granted) return 'granted';
      return requested.canAskAgain ? 'denied' : 'blocked';
    } catch {
      return 'denied';
    }
  },

  /** Replaces any existing reminder with one repeating every day at `time` ("HH:MM"). */
  async schedule(time: string): Promise<void> {
    const clock = parseReminderTime(time);
    if (!clock) throw new Error(`Invalid reminder time: ${time}`);
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
        name: ANDROID_CHANNEL_NAME,
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_ID,
      content: { title: REMINDER_TITLE, body: REMINDER_BODY },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: clock.hour,
        minute: clock.minute,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
  },

  async cancel(): Promise<void> {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_ID);
  },

  /** Opens the OS settings page of this app so the user can allow notifications. */
  openSettings(): void {
    Linking.openSettings().catch(() => undefined);
  },
};
