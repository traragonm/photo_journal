/** Pure helpers for the daily reminder time ("HH:MM", local) — shared by native, web and tests. */

export interface ReminderClock {
  hour: number;
  minute: number;
}

/** Outcome of asking for notification permission. 'blocked' = the OS will not ask again. */
export type ReminderPermission = 'granted' | 'denied' | 'blocked';

export const HOURS_PER_DAY = 24;
export const MINUTES_PER_HOUR = 60;
/** Minute stepper granularity in the reminder editor. */
export const REMINDER_MINUTE_STEP = 5;

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

const pad2 = (value: number): string => String(value).padStart(2, '0');
const wrap = (value: number, modulus: number): number => ((value % modulus) + modulus) % modulus;

/** "20:30" → { hour: 20, minute: 30 }; null when malformed. */
export function parseReminderTime(value: string): ReminderClock | null {
  const match = TIME_PATTERN.exec(value);
  if (!match) return null;
  return { hour: Number(match[1]), minute: Number(match[2]) };
}

export function formatReminderTime({ hour, minute }: ReminderClock): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/** Moves the hour by `delta`, wrapping 23 → 0 without touching minutes. */
export function shiftHour(clock: ReminderClock, delta: number): ReminderClock {
  return { ...clock, hour: wrap(clock.hour + delta, HOURS_PER_DAY) };
}

/** Moves the minute by `delta`, wrapping 59 → 0 without carrying into the hour. */
export function shiftMinute(clock: ReminderClock, delta: number): ReminderClock {
  return { ...clock, minute: wrap(clock.minute + delta, MINUTES_PER_HOUR) };
}

/** Parses a stored time, falling back to `fallback` for corrupt values. */
export function clockOrDefault(value: string, fallback: ReminderClock): ReminderClock {
  return parseReminderTime(value) ?? fallback;
}
