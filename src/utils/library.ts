import type { PhotoEntry } from '@/models';
import { formatMonthTitle } from './date';

export interface MonthGroup {
  /** "YYYY-MM" */
  key: string;
  title: string;
  /** Newest first. */
  photos: PhotoEntry[];
}

/** Groups photos by local calendar month, newest month first and newest photo first within it. */
export function groupPhotosByMonth(photos: readonly PhotoEntry[]): MonthGroup[] {
  const sorted = [...photos].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const groups: MonthGroup[] = [];
  for (const photo of sorted) {
    const date = new Date(photo.createdAt);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const last = groups[groups.length - 1];
    if (last && last.key === key) {
      last.photos.push(photo);
    } else {
      groups.push({ key, title: formatMonthTitle(date.getFullYear(), date.getMonth()), photos: [photo] });
    }
  }
  return groups;
}

/** Splits a list into rows of `size`. */
export function chunk<T>(items: readonly T[], size: number): T[][] {
  const rows: T[][] = [];
  for (let i = 0; i < items.length; i += size) rows.push(items.slice(i, i + size));
  return rows;
}
