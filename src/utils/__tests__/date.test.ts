import {
  addDays,
  dateOfDayKey,
  dayKeyOf,
  formatClock,
  formatDayTitle,
  formatLongDate,
  formatMonthTitle,
  formatWeekdayDate,
  startOfWeek,
} from '../date';
import { buildMonthGrid, buildWeekStrip, groupPhotosByDay, monthStats, photosInRange } from '../days';
import type { PhotoEntry } from '@/models';

const at = (y: number, m: number, d: number, h = 12, min = 0) => new Date(y, m - 1, d, h, min).toISOString();

const photo = (id: string, iso: string): PhotoEntry => ({
  id,
  imageUri: `file:///${id}.jpg`,
  createdAt: iso,
  latitude: null,
  longitude: null,
  locationName: null,
  caption: null,
  cameraType: 'back',
  frameType: 'square',
  filter: 'original',
  weather: null,
  mood: null,
  width: null,
  height: null,
  isImageAvailable: true,
});

// Friday 2 October 2026
const today = new Date(2026, 9, 2, 9, 0);

describe('Vietnamese date formatting', () => {
  it('formats clocks, weekdays and months', () => {
    expect(formatClock(at(2026, 10, 2, 7, 42))).toBe('07:42');
    expect(formatWeekdayDate(today)).toBe('Thứ Sáu, 2 tháng 10');
    expect(formatLongDate(at(2026, 10, 2))).toBe('2 tháng 10, 2026');
    expect(formatMonthTitle(2026, 9)).toBe('Tháng 10, 2026');
  });

  it('titles today, yesterday and older days', () => {
    expect(formatDayTitle('2026-10-02', today)).toBe('Hôm nay');
    expect(formatDayTitle('2026-10-01', today)).toBe('Hôm qua');
    expect(formatDayTitle('2026-09-28', today)).toBe('Thứ Hai, 28 tháng 9');
  });

  it('round-trips day keys and finds Monday', () => {
    expect(dayKeyOf(dateOfDayKey('2026-10-02'))).toBe('2026-10-02');
    expect(dayKeyOf(startOfWeek(today))).toBe('2026-09-28');
    expect(dayKeyOf(startOfWeek(new Date(2026, 9, 4)))).toBe('2026-09-28'); // Sunday
    expect(dayKeyOf(addDays(today, 30))).toBe('2026-11-01');
  });
});

describe('day grouping', () => {
  const photos = [
    photo('c', at(2026, 10, 2, 17, 58)),
    photo('b', at(2026, 10, 2, 12, 30)),
    photo('a', at(2026, 10, 2, 7, 42)),
    photo('y', at(2026, 10, 1)),
    photo('w', at(2026, 9, 30)),
    photo('old', at(2026, 9, 20)),
  ];
  const byDay = groupPhotosByDay(photos);

  it('groups by local day, oldest first within a day', () => {
    expect(byDay.get('2026-10-02')?.map((p) => p.id)).toEqual(['a', 'b', 'c']);
  });

  it('builds the Monday-first week strip', () => {
    const week = buildWeekStrip('2026-10-02', byDay, today);
    expect(week.map((d) => `${d.weekday}${d.dayOfMonth}`)).toEqual(['T228', 'T329', 'T430', 'T51', 'T62', 'T73', 'CN4']);
    expect(week[4]).toMatchObject({ isToday: true, isSelected: true, hasPhotos: true });
    expect(week[5].isFuture).toBe(true);
    expect(week[1].hasPhotos).toBe(false);
  });

  it('builds a whole-week month grid', () => {
    const grid = buildMonthGrid(2026, 9, byDay, today);
    expect(grid[0]).toMatchObject({ key: '2026-09-28', isOutside: true });
    expect(grid.length % 7).toBe(0);
    expect(grid.find((c) => c.key === '2026-10-02')?.photos).toHaveLength(3);
    expect(grid[grid.length - 1].key).toBe('2026-11-01');
  });

  it('computes month stats and the current streak', () => {
    expect(monthStats(2026, 9, byDay, today)).toEqual({ daysWithPhotos: 2, photoCount: 4, streak: 3 });
  });

  it('filters by map time range', () => {
    expect(photosInRange(photos, 'today', today)).toHaveLength(3);
    expect(photosInRange(photos, 'week', today)).toHaveLength(5);
    expect(photosInRange(photos, 'all', today)).toHaveLength(6);
  });
});
