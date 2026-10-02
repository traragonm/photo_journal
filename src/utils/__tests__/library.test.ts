import type { PhotoEntry } from '@/models';
import { chunk, groupPhotosByMonth } from '../library';

const photo = (id: string, y: number, m: number, d: number): PhotoEntry => ({
  id,
  imageUri: '',
  createdAt: new Date(y, m - 1, d, 12).toISOString(),
  latitude: null,
  longitude: null,
  locationName: null,
  caption: null,
  cameraType: 'back',
  frameType: 'mini',
  filter: 'original',
  width: null,
  height: null,
  isImageAvailable: true,
});

describe('groupPhotosByMonth', () => {
  it('returns nothing for no photos', () => {
    expect(groupPhotosByMonth([])).toEqual([]);
  });

  it('groups by month, newest first, regardless of input order', () => {
    const groups = groupPhotosByMonth([photo('a', 2026, 9, 3), photo('b', 2026, 10, 1), photo('c', 2026, 10, 5), photo('d', 2025, 10, 2)]);
    expect(groups.map((g) => g.title)).toEqual(['Tháng 10, 2026', 'Tháng 9, 2026', 'Tháng 10, 2025']);
    expect(groups[0].photos.map((p) => p.id)).toEqual(['c', 'b']);
  });
});

describe('chunk', () => {
  it('splits into rows', () => {
    expect(chunk([1, 2, 3, 4, 5], 3)).toEqual([[1, 2, 3], [4, 5]]);
  });
});
