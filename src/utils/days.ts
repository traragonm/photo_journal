import type { PhotoEntry } from '@/models';
import { addDays, dateOfDayKey, dayKeyOf, dayKeyOfIso, startOfWeek, weekdayShort, type DayKey } from './date';

const DAYS_PER_WEEK = 7;

/** Photos grouped by local day, each day oldest → newest (the order they were taken). */
export function groupPhotosByDay(photos: readonly PhotoEntry[]): Map<DayKey, PhotoEntry[]> {
  const byDay = new Map<DayKey, PhotoEntry[]>();
  for (const photo of photos) {
    const key = dayKeyOfIso(photo.createdAt);
    const list = byDay.get(key);
    if (list) list.push(photo);
    else byDay.set(key, [photo]);
  }
  for (const list of byDay.values()) list.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return byDay;
}

export interface WeekDay {
  key: DayKey;
  /** "T2"… "CN" */
  weekday: string;
  dayOfMonth: number;
  hasPhotos: boolean;
  isToday: boolean;
  isFuture: boolean;
  isSelected: boolean;
}

/** The Monday-first week containing `selected` (the diary's day strip). */
export function buildWeekStrip(
  selected: DayKey,
  byDay: ReadonlyMap<DayKey, readonly PhotoEntry[]>,
  today: Date = new Date(),
): WeekDay[] {
  const todayKey = dayKeyOf(today);
  const monday = startOfWeek(dateOfDayKey(selected));
  return Array.from({ length: DAYS_PER_WEEK }, (_, i) => {
    const date = addDays(monday, i);
    const key = dayKeyOf(date);
    return {
      key,
      weekday: weekdayShort(date),
      dayOfMonth: date.getDate(),
      hasPhotos: (byDay.get(key)?.length ?? 0) > 0,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      isSelected: key === selected,
    };
  });
}

export interface MonthCell {
  key: DayKey;
  dayOfMonth: number;
  /** Belongs to the previous/next month (rendered faded). */
  isOutside: boolean;
  isToday: boolean;
  isFuture: boolean;
  photos: readonly PhotoEntry[];
}

/** Monday-first grid of whole weeks covering `month` (0-based) of `year`. */
export function buildMonthGrid(
  year: number,
  month: number,
  byDay: ReadonlyMap<DayKey, readonly PhotoEntry[]>,
  today: Date = new Date(),
): MonthCell[] {
  const todayKey = dayKeyOf(today);
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const gridStart = startOfWeek(first);
  const gridEnd = addDays(startOfWeek(last), DAYS_PER_WEEK - 1);
  const cells: MonthCell[] = [];
  for (let date = gridStart; date <= gridEnd; date = addDays(date, 1)) {
    const key = dayKeyOf(date);
    cells.push({
      key,
      dayOfMonth: date.getDate(),
      isOutside: date.getMonth() !== month,
      isToday: key === todayKey,
      isFuture: key > todayKey,
      photos: byDay.get(key) ?? [],
    });
  }
  return cells;
}

export interface MonthStats {
  daysWithPhotos: number;
  photoCount: number;
  /** Consecutive days with photos, ending today (or yesterday if today has none yet). */
  streak: number;
}

export function monthStats(
  year: number,
  month: number,
  byDay: ReadonlyMap<DayKey, readonly PhotoEntry[]>,
  today: Date = new Date(),
): MonthStats {
  let daysWithPhotos = 0;
  let photoCount = 0;
  for (const [key, list] of byDay) {
    const date = dateOfDayKey(key);
    if (date.getFullYear() === year && date.getMonth() === month && list.length > 0) {
      daysWithPhotos++;
      photoCount += list.length;
    }
  }
  let cursor = byDay.has(dayKeyOf(today)) ? today : addDays(today, -1);
  let streak = 0;
  while ((byDay.get(dayKeyOf(cursor))?.length ?? 0) > 0) {
    streak++;
    cursor = addDays(cursor, -1);
  }
  return { daysWithPhotos, photoCount, streak };
}

export type TimeRange = 'today' | 'week' | 'all';

/** Photos inside a map time range ("Hôm nay" / "Tuần này" = since Monday / "Tất cả"). */
export function photosInRange<T extends PhotoEntry>(photos: readonly T[], range: TimeRange, today: Date = new Date()): T[] {
  if (range === 'all') return [...photos];
  const from = range === 'today' ? dayKeyOf(today) : dayKeyOf(startOfWeek(today));
  const to = dayKeyOf(today);
  return photos.filter((photo) => {
    const key = dayKeyOfIso(photo.createdAt);
    return key >= from && key <= to;
  });
}
