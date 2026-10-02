/** Vietnamese date helpers. All "day" logic uses the device's local time zone. */

const WEEKDAY_LONG = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
/** Short labels, indexed by JS getDay() (0 = Sunday). */
const WEEKDAY_SHORT = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
/** Monday-first column headers for week strips and month grids. */
export const WEEKDAY_HEADERS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'] as const;

const pad2 = (value: number): string => String(value).padStart(2, '0');

/** Local calendar day as "YYYY-MM-DD". */
export type DayKey = string;

export function dayKeyOf(date: Date): DayKey {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function dayKeyOfIso(iso: string): DayKey {
  return dayKeyOf(new Date(iso));
}

/** Local midnight of a day key. */
export function dateOfDayKey(key: DayKey): Date {
  const [year, month, day] = key.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: Date): Date {
  const mondayOffset = (date.getDay() + 6) % 7;
  return addDays(date, -mondayOffset);
}

export function weekdayShort(date: Date): string {
  return WEEKDAY_SHORT[date.getDay()];
}

/** "18:30" */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** "Thứ Sáu, 2 tháng 10" */
export function formatWeekdayDate(date: Date): string {
  return `${WEEKDAY_LONG[date.getDay()]}, ${date.getDate()} tháng ${date.getMonth() + 1}`;
}

/** "2 tháng 10, 2026" */
export function formatLongDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getDate()} tháng ${d.getMonth() + 1}, ${d.getFullYear()}`;
}

/** "Tháng 10, 2026" (month is 0-based). */
export function formatMonthTitle(year: number, month: number): string {
  return `Tháng ${month + 1}, ${year}`;
}

/** Title for a diary day: "Hôm nay", "Hôm qua", else "Thứ Năm, 1 tháng 10". */
export function formatDayTitle(key: DayKey, today: Date = new Date()): string {
  if (key === dayKeyOf(today)) return 'Hôm nay';
  if (key === dayKeyOf(addDays(today, -1))) return 'Hôm qua';
  return formatWeekdayDate(dateOfDayKey(key));
}

/** Film date stamp: "'26 10 02" */
export function formatFilmStamp(iso: string): string {
  const d = new Date(iso);
  return `'${pad2(d.getFullYear() % 100)} ${pad2(d.getMonth() + 1)} ${pad2(d.getDate())}`;
}
