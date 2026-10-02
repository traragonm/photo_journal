/** @jest-environment node */
import 'fake-indexeddb/auto';
import { IDBFactory } from 'fake-indexeddb';
import { DEFAULT_SETTINGS, type NewPhotoEntry } from '@/models';
import { closeDatabase, dbPut, SETTINGS_STORE } from '../indexedDb';
import { WebPhotoRepository } from '../WebPhotoRepository';
import { WebSettingsRepository } from '../WebSettingsRepository';

const PIXEL_DATA_URI = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2Q==';
const EMPTY_DATA_URI = 'data:image/jpeg;base64,';

function newEntry(id: string, createdAt: string, overrides: Partial<NewPhotoEntry> = {}): NewPhotoEntry {
  return {
    id,
    sourceUri: PIXEL_DATA_URI,
    createdAt,
    latitude: null,
    longitude: null,
    locationName: null,
    caption: null,
    cameraType: 'back',
    frameType: 'square',
    filter: 'original',
    width: 1080,
    height: 1440,
    ...overrides,
  };
}

/** Minimal browser-like object URL registry (jest-expo's URL polyfill cannot create them). */
const objectUrlStore = new Map<string, Blob>();
let objectUrlCounter = 0;

const DATA_URI_PATTERN = /^data:([^;,]+);base64,(.*)$/;

/**
 * jest-expo replaces `fetch` with a React Native polyfill that cannot read data:/blob: URLs
 * (browsers can). This stub mirrors the browser behaviour the repository relies on.
 */
function browserLikeFetch(input: string): Promise<{ ok: boolean; status: number; blob: () => Promise<Blob> }> {
  const dataMatch = DATA_URI_PATTERN.exec(input);
  if (dataMatch) {
    const blob = new Blob([Uint8Array.from(atob(dataMatch[2]), (char) => char.charCodeAt(0))], { type: dataMatch[1] });
    return Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(blob) });
  }
  const stored = input.startsWith('blob:') ? objectUrlStore.get(input) : undefined;
  if (stored) return Promise.resolve({ ok: true, status: 200, blob: () => Promise.resolve(stored) });
  return Promise.reject(new TypeError('Failed to fetch'));
}

const realFetch = globalThis.fetch;
const realCreateObjectURL = URL.createObjectURL;
const realRevokeObjectURL = URL.revokeObjectURL;
beforeAll(() => {
  globalThis.fetch = browserLikeFetch as unknown as typeof fetch;
  URL.createObjectURL = (blob: Blob) => {
    const url = `blob:test/${objectUrlCounter++}`;
    objectUrlStore.set(url, blob);
    return url;
  };
  URL.revokeObjectURL = (url: string) => {
    objectUrlStore.delete(url);
  };
});
beforeEach(async () => {
  await closeDatabase();
  globalThis.indexedDB = new IDBFactory(); // fresh, empty database per test
});

afterAll(async () => {
  globalThis.fetch = realFetch;
  URL.createObjectURL = realCreateObjectURL;
  URL.revokeObjectURL = realRevokeObjectURL;
  await closeDatabase();
});

describe('WebPhotoRepository', () => {
  it('creates entries newest-first and notifies subscribers', async () => {
    const repo = new WebPhotoRepository();
    await repo.load();
    const listener = jest.fn();
    repo.subscribe(listener);

    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z'));
    await repo.create(newEntry('b', '2026-10-02T10:00:00.000Z', { latitude: 21.0285, longitude: 105.8542 }));

    const { photos, isLoaded } = repo.getSnapshot();
    expect(isLoaded).toBe(true);
    expect(photos.map((p) => p.id)).toEqual(['b', 'a']);
    expect(photos[0]).toMatchObject({ latitude: 21.0285, isImageAvailable: true });
    expect(photos[0].imageUri).toMatch(/^blob:/);
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('persists across a restart (new repository over the same database)', async () => {
    const repo = new WebPhotoRepository();
    await repo.load();
    const caption = 'Một buổi chiều bình thường';
    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z', { caption }));
    await repo.create(newEntry('b', '2026-10-03T10:00:00.000Z'));

    const restarted = new WebPhotoRepository();
    await restarted.load();
    expect(restarted.getSnapshot().photos.map((p) => p.id)).toEqual(['b', 'a']);
    expect(restarted.getById('a')).toMatchObject({ caption, isImageAvailable: true });

    const response = await fetch(restarted.getById('a')?.imageUri ?? '');
    expect((await response.blob()).size).toBeGreaterThan(0);
  });

  it('ignores a duplicate create of the same capture', async () => {
    const repo = new WebPhotoRepository();
    await repo.load();
    const entry = newEntry('dup', '2026-10-01T10:00:00.000Z');
    const first = await repo.create(entry);
    const second = await repo.create(entry);
    expect(second).toBe(first);
    expect(repo.getSnapshot().photos).toHaveLength(1);
  });

  it('shares one write when the same capture is submitted concurrently', async () => {
    const repo = new WebPhotoRepository();
    await repo.load();
    const entry = newEntry('race', '2026-10-01T10:00:00.000Z');
    const [first, second] = await Promise.all([repo.create(entry), repo.create(entry)]);
    expect(first).toBe(second);
    expect(repo.getSnapshot().photos).toHaveLength(1);
  });

  it('rejects an empty image and stores nothing', async () => {
    const repo = new WebPhotoRepository();
    await repo.load();
    await expect(repo.create(newEntry('empty', '2026-10-01T10:00:00.000Z', { sourceUri: EMPTY_DATA_URI }))).rejects.toThrow(
      /empty/i,
    );
    expect(repo.getSnapshot().photos).toHaveLength(0);
    const restarted = new WebPhotoRepository();
    await restarted.load();
    expect(restarted.getSnapshot().photos).toHaveLength(0);
  });

  it('rejects an unreadable source with a clear error', async () => {
    const repo = new WebPhotoRepository();
    await repo.load();
    await expect(
      repo.create(newEntry('bad', '2026-10-01T10:00:00.000Z', { sourceUri: 'not a url' })),
    ).rejects.toThrow(/Could not read the captured photo/);
  });

  it('keeps both fields when caption and locationName updates overlap', async () => {
    const repo = new WebPhotoRepository();
    await repo.load();
    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z'));

    await Promise.all([
      repo.update('a', { caption: 'hello' }),
      repo.update('a', { locationName: 'Hanoi' }),
    ]);

    expect(repo.getById('a')).toMatchObject({ caption: 'hello', locationName: 'Hanoi' });
    const restarted = new WebPhotoRepository();
    await restarted.load();
    expect(restarted.getById('a')).toMatchObject({ caption: 'hello', locationName: 'Hanoi' });
  });

  it('throws when updating a missing photo', async () => {
    const repo = new WebPhotoRepository();
    await repo.load();
    await expect(repo.update('nope', { caption: 'x' })).rejects.toThrow(/not found/);
  });

  it('removes one photo and revokes its object URL', async () => {
    const revoke = jest.spyOn(URL, 'revokeObjectURL');
    const repo = new WebPhotoRepository();
    await repo.load();
    const a = await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z'));
    await repo.create(newEntry('b', '2026-10-02T10:00:00.000Z'));

    await repo.remove('a');

    expect(repo.getSnapshot().photos.map((p) => p.id)).toEqual(['b']);
    expect(revoke).toHaveBeenCalledWith(a.imageUri);
    const restarted = new WebPhotoRepository();
    await restarted.load();
    expect(restarted.getSnapshot().photos.map((p) => p.id)).toEqual(['b']);
    revoke.mockRestore();
  });

  it('removes everything', async () => {
    const repo = new WebPhotoRepository();
    await repo.load();
    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z'));
    await repo.create(newEntry('b', '2026-10-02T10:00:00.000Z'));

    await repo.removeAll();

    expect(repo.getSnapshot().photos).toEqual([]);
    const restarted = new WebPhotoRepository();
    await restarted.load();
    expect(restarted.getSnapshot()).toMatchObject({ photos: [], isLoaded: true });
  });

  it('throws a clear error when IndexedDB is unavailable', async () => {
    const original = globalThis.indexedDB;
    // @ts-expect-error simulate a browser without IndexedDB
    delete globalThis.indexedDB;
    try {
      await expect(new WebPhotoRepository().load()).rejects.toThrow(/unavailable/i);
    } finally {
      globalThis.indexedDB = original;
    }
  });
});

describe('WebSettingsRepository', () => {
  it('returns defaults when nothing is stored', async () => {
    const repo = new WebSettingsRepository();
    await repo.load();
    expect(repo.getSnapshot()).toEqual(DEFAULT_SETTINGS);
  });

  it('persists updates across a restart and notifies', async () => {
    const repo = new WebSettingsRepository();
    await repo.load();
    const listener = jest.fn();
    repo.subscribe(listener);

    await repo.update({ frameColor: 'cream', soundEnabled: false });
    expect(listener).toHaveBeenCalled();

    const restarted = new WebSettingsRepository();
    await restarted.load();
    expect(restarted.getSnapshot()).toEqual({ ...DEFAULT_SETTINGS, frameColor: 'cream', soundEnabled: false });
  });

  it('falls back to defaults for corrupt or unknown values', async () => {
    await dbPut(SETTINGS_STORE, { key: 'soundEnabled', value: 'yes please' });
    await dbPut(SETTINGS_STORE, { key: 'frameColor', value: 'black' });
    await dbPut(SETTINGS_STORE, { key: 'bogusKey', value: true });

    const repo = new WebSettingsRepository();
    await repo.load();
    expect(repo.getSnapshot()).toEqual({ ...DEFAULT_SETTINGS, frameColor: 'black' });
  });

  it('rolls back the optimistic update when the write fails', async () => {
    const repo = new WebSettingsRepository();
    await repo.load();
    const original = globalThis.indexedDB;
    await closeDatabase();
    // @ts-expect-error simulate a browser without IndexedDB
    delete globalThis.indexedDB;
    try {
      await expect(repo.update({ soundEnabled: false })).rejects.toThrow();
    } finally {
      globalThis.indexedDB = original;
    }
    expect(repo.getSnapshot().soundEnabled).toBe(DEFAULT_SETTINGS.soundEnabled);
  });
});
