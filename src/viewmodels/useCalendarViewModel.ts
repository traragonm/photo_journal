import { useCallback, useMemo, useState } from 'react';
import { router } from 'expo-router';
import type { PhotoEntry } from '@/models';
import {
  dateOfDayKey,
  dayKeyOf,
  formatMonthTitle,
  formatWeekdayDate,
  WEEKDAY_HEADERS,
  type DayKey,
} from '@/utils/date';
import { buildMonthGrid, groupPhotosByDay, monthStats } from '@/utils/days';
import { useHomeNav } from '@/views/home/HomeNavigator';
import { usePhotoStore } from './shared';

/** Most prints previewed in the selected-day card. */
const MAX_CARD_PRINTS = 3;
const MONTHS_PER_YEAR = 12;

export interface CalendarCellModel {
  key: DayKey;
  dayOfMonth: number;
  isOutside: boolean;
  isToday: boolean;
  isFuture: boolean;
  isSelected: boolean;
  photoCount: number;
  /** Newest photo of the day (drawn on top), if any. */
  coverPhoto: PhotoEntry | null;
  /** Tilt of the mini print, from the cell's position. */
  tilt: number;
  /** Accessible label, e.g. "2 tháng 10, 3 ảnh, hôm nay". */
  label: string;
}

export interface CalendarViewModel {
  title: string;
  stats: string;
  weekdayHeaders: readonly string[];
  /** Grid cells in Monday-first rows of seven. */
  rows: CalendarCellModel[][];
  canGoNext: boolean;
  goPreviousMonth: () => void;
  goNextMonth: () => void;
  selectCell: (key: DayKey) => void;
  selectedTitle: string;
  selectedPhotos: readonly PhotoEntry[];
  /** Photos of the selected day that don't fit the card. */
  selectedExtra: number;
  openDiary: () => void;
  openPhoto: (photo: PhotoEntry) => void;
}

const DAYS_PER_WEEK = 7;
const CELL_TILTS = [-5, 4, -2, 6, -3] as const;

interface MonthRef {
  year: number;
  month: number;
}

const monthOfDay = (key: DayKey): MonthRef => {
  const date = dateOfDayKey(key);
  return { year: date.getFullYear(), month: date.getMonth() };
};

function shiftMonth({ year, month }: MonthRef, delta: number): MonthRef {
  const index = year * MONTHS_PER_YEAR + month + delta;
  return { year: Math.floor(index / MONTHS_PER_YEAR), month: ((index % MONTHS_PER_YEAR) + MONTHS_PER_YEAR) % MONTHS_PER_YEAR };
}

function cellLabel(key: DayKey, count: number, isToday: boolean): string {
  const date = dateOfDayKey(key);
  const parts = [`${date.getDate()} tháng ${date.getMonth() + 1}`];
  if (count > 0) parts.push(`${count} ảnh`);
  if (isToday) parts.push('hôm nay');
  return parts.join(', ');
}

/** State and actions of the calendar sheet body. */
export function useCalendarViewModel(): CalendarViewModel {
  const { selectedDay, selectDay, closeSheet, sheet } = useHomeNav();
  const { photos } = usePhotoStore();
  // null = follow the selected day's month; set once the user pages months or picks a day.
  const [viewed, setViewed] = useState<MonthRef | null>(null);
  const [lastSheet, setLastSheet] = useState(sheet);
  if (lastSheet !== sheet) {
    setLastSheet(sheet);
    // Opening the sheet always starts on the selected day's month.
    if (sheet === 'calendar') setViewed(null);
  }

  const today = new Date();
  const todayKey = dayKeyOf(today);
  const current = viewed ?? monthOfDay(selectedDay);
  const byDay = useMemo(() => groupPhotosByDay(photos), [photos]);

  const rows = useMemo(() => {
    const cells = buildMonthGrid(current.year, current.month, byDay, new Date());
    const models = cells.map((cell, index): CalendarCellModel => ({
      key: cell.key,
      dayOfMonth: cell.dayOfMonth,
      isOutside: cell.isOutside,
      isToday: cell.isToday,
      isFuture: cell.isFuture,
      isSelected: cell.key === selectedDay,
      photoCount: cell.photos.length,
      coverPhoto: cell.photos.length > 0 ? cell.photos[cell.photos.length - 1] : null,
      tilt: CELL_TILTS[index % CELL_TILTS.length],
      label: cellLabel(cell.key, cell.photos.length, cell.isToday),
    }));
    const chunks: CalendarCellModel[][] = [];
    for (let i = 0; i < models.length; i += DAYS_PER_WEEK) chunks.push(models.slice(i, i + DAYS_PER_WEEK));
    return chunks;
  }, [current.year, current.month, byDay, selectedDay]);

  const stats = useMemo(() => {
    const result = monthStats(current.year, current.month, byDay, new Date());
    const parts = [`${result.daysWithPhotos} ngày có ảnh`, `${result.photoCount} tấm`];
    // The streak ends today, so it only describes the current month.
    const isCurrentMonth = monthOfDay(todayKey).year === current.year && monthOfDay(todayKey).month === current.month;
    if (isCurrentMonth && result.streak > 0) parts.push(`chuỗi ${result.streak} ngày`);
    return parts.join(' · ');
  }, [current.year, current.month, byDay, todayKey]);

  const nowMonth = monthOfDay(todayKey);
  const canGoNext = current.year * MONTHS_PER_YEAR + current.month < nowMonth.year * MONTHS_PER_YEAR + nowMonth.month;

  const goPreviousMonth = useCallback(() => setViewed(shiftMonth(current, -1)), [current]);
  const goNextMonth = useCallback(() => {
    if (canGoNext) setViewed(shiftMonth(current, 1));
  }, [current, canGoNext]);

  const selectCell = useCallback(
    (key: DayKey) => {
      if (key > dayKeyOf(new Date())) return;
      setViewed(current); // keep paging where it is even when a day outside the month is picked
      selectDay(key);
    },
    [current, selectDay],
  );

  const dayPhotos = byDay.get(selectedDay) ?? [];
  const openDiary = useCallback(() => {
    selectDay(selectedDay);
    closeSheet();
  }, [selectDay, selectedDay, closeSheet]);
  const openPhoto = useCallback((photo: PhotoEntry) => {
    router.push({ pathname: '/photo/[id]', params: { id: photo.id } });
  }, []);

  return {
    title: formatMonthTitle(current.year, current.month),
    stats,
    weekdayHeaders: WEEKDAY_HEADERS,
    rows,
    canGoNext,
    goPreviousMonth,
    goNextMonth,
    selectCell,
    selectedTitle: formatWeekdayDate(dateOfDayKey(selectedDay)),
    selectedPhotos: dayPhotos.slice(0, MAX_CARD_PRINTS),
    selectedExtra: Math.max(dayPhotos.length - MAX_CARD_PRINTS, 0),
    openDiary,
    openPhoto,
  };
}
