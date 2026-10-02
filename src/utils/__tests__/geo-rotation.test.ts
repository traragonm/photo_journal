import { printRotations } from '@/theme';
import { formatLatitude, formatLongitude, formatPlace } from '../geo';
import { hashString, rotationFor } from '../rotation';

describe('geo formatting', () => {
  it('formats coordinates with hemispheres', () => {
    expect(formatLatitude(21.0285)).toBe('21.0285° N');
    expect(formatLongitude(105.8542)).toBe('105.8542° E');
    expect(formatLatitude(-33.8688)).toBe('33.8688° S');
    expect(formatLongitude(-0.1276)).toBe('0.1276° W');
  });

  it('prefers the place name and falls back to coordinates', () => {
    expect(formatPlace('Hanoi', 21, 105)).toBe('Hanoi');
    expect(formatPlace(null, 21.0285, 105.8542)).toBe('21.0285° N  105.8542° E');
    expect(formatPlace(null, null, null)).toBeNull();
  });
});

describe('deterministic rotation', () => {
  it('returns the same tilt for the same id', () => {
    const id = '3f1c7a2e-0000-4000-8000-000000000001';
    expect(rotationFor(id)).toBe(rotationFor(id));
    expect(hashString(id)).toBe(hashString(id));
  });

  it('only uses the allowed rotation set', () => {
    for (let i = 0; i < 200; i++) {
      expect(printRotations).toContain(rotationFor(`photo-${i}`));
    }
  });

  it('spreads ids across several tilts', () => {
    const tilts = new Set(Array.from({ length: 50 }, (_, i) => rotationFor(`id-${i}`)));
    expect(tilts.size).toBeGreaterThan(2);
  });
});
