import { DEFAULT_SETTINGS, type NewPhotoEntry } from '@/models';
import { LocalPhotoRepository } from '../PhotoRepository';
import { LocalSettingsRepository } from '../SettingsRepository';
import { FakeDatabase, FakeImageStorage } from '../testing/fakes';

function newEntry(id: string, createdAt: string, overrides: Partial<NewPhotoEntry> = {}): NewPhotoEntry {
  return {
    id,
    sourceUri: `file:///cache/${id}.jpg`,
    createdAt,
    latitude: null,
    longitude: null,
    locationName: null,
    caption: null,
    cameraType: 'back',
    frameType: 'square',
    filter: 'original',
    weather: 'sunny',
    mood: 'calm',
    width: 1080,
    height: 1440,
    ...overrides,
  };
}

function setup() {
  const db = new FakeDatabase();
  const storage = new FakeImageStorage();
  const repo = new LocalPhotoRepository(db.asDatabase(), storage.asStorage());
  return { db, storage, repo };
}

describe('LocalPhotoRepository', () => {
  it('creates entries newest-first and notifies subscribers', async () => {
    const { repo } = setup();
    await repo.load();
    const listener = jest.fn();
    repo.subscribe(listener);

    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z'));
    await repo.create(newEntry('b', '2026-10-02T10:00:00.000Z', { latitude: 21.0285, longitude: 105.8542 }));

    const { photos, isLoaded } = repo.getSnapshot();
    expect(isLoaded).toBe(true);
    expect(photos.map((p) => p.id)).toEqual(['b', 'a']);
    expect(photos[0]).toMatchObject({ latitude: 21.0285, isImageAvailable: true });
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it('persists across a restart (new repository over the same storage)', async () => {
    const { db, storage, repo } = setup();
    await repo.load();
    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z', { caption: 'Một buổi chiều bình thường', frameType: 'wide', filter: 'warm', weather: 'rainy', mood: 'tired' }));

    const restarted = new LocalPhotoRepository(db.asDatabase(), storage.asStorage());
    await restarted.load();
    expect(restarted.getSnapshot().photos).toHaveLength(1);
    expect(restarted.getById('a')).toMatchObject({ caption: 'Một buổi chiều bình thường', frameType: 'wide', filter: 'warm', weather: 'rainy', mood: 'tired' });
  });

  it('ignores a duplicate create of the same capture', async () => {
    const { db, repo } = setup();
    await repo.load();
    const entry = newEntry('dup', '2026-10-01T10:00:00.000Z');
    await repo.create(entry);
    await repo.create(entry);
    expect(repo.getSnapshot().photos).toHaveLength(1);
    expect(db.photos.size).toBe(1);
  });

  it('shares one write when the same capture is submitted concurrently', async () => {
    const { db, repo } = setup();
    await repo.load();
    const entry = newEntry('race', '2026-10-01T10:00:00.000Z');
    const [first, second] = await Promise.all([repo.create(entry), repo.create(entry)]);
    expect(first).toBe(second);
    expect(repo.getSnapshot().photos).toHaveLength(1);
    expect(db.photos.size).toBe(1);
  });

  it('removes the stored file when the DB insert fails', async () => {
    const { db, storage, repo } = setup();
    await repo.load();
    db.failNextInsert = true;
    await expect(repo.create(newEntry('x', '2026-10-01T10:00:00.000Z'))).rejects.toThrow('disk full');
    expect(storage.files.size).toBe(0);
    expect(repo.getSnapshot().photos).toHaveLength(0);
  });

  it('propagates a missing captured image without writing a row', async () => {
    const { db, storage, repo } = setup();
    await repo.load();
    storage.missingSources.add('file:///cache/m.jpg');
    await expect(repo.create(newEntry('m', '2026-10-01T10:00:00.000Z'))).rejects.toThrow();
    expect(db.photos.size).toBe(0);
  });

  it('flags entries whose image file is gone and cleans orphan files on load', async () => {
    const { db, storage, repo } = setup();
    await repo.load();
    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z'));
    storage.files.delete('a.jpg'); // corrupted / deleted externally
    storage.files.add('orphan.jpg'); // app killed between copy and insert

    await repo.load();
    expect(repo.getById('a')?.isImageAvailable).toBe(false);
    expect(storage.files.has('orphan.jpg')).toBe(false);
    expect(db.photos.size).toBe(1);
  });

  it('updates captions and deletes entries with their files', async () => {
    const { db, storage, repo } = setup();
    await repo.load();
    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z'));

    await repo.update('a', { caption: 'hello' });
    expect(repo.getById('a')?.caption).toBe('hello');
    expect(db.photos.get('a')?.caption).toBe('hello');

    await repo.remove('a');
    expect(repo.getById('a')).toBeUndefined();
    expect(storage.files.size).toBe(0);
  });

  it('removeAll clears rows and files', async () => {
    const { db, storage, repo } = setup();
    await repo.load();
    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z'));
    await repo.create(newEntry('b', '2026-10-02T10:00:00.000Z'));
    await repo.removeAll();
    expect(repo.getSnapshot().photos).toHaveLength(0);
    expect(db.photos.size).toBe(0);
    expect(storage.files.size).toBe(0);
  });

  it('keeps both fields when caption and place-name updates overlap', async () => {
    const { db, repo } = setup();
    await repo.load();
    await repo.create(newEntry('a', '2026-10-01T10:00:00.000Z'));

    await Promise.all([
      repo.update('a', { caption: 'sunset' }),
      repo.update('a', { locationName: 'Hanoi' }),
    ]);
    expect(repo.getById('a')).toMatchObject({ caption: 'sunset', locationName: 'Hanoi' });
    expect(db.photos.get('a')).toMatchObject({ caption: 'sunset', location_name: 'Hanoi' });
  });

  it('rejects updates for unknown ids', async () => {
    const { repo } = setup();
    await repo.load();
    await expect(repo.update('nope', { caption: 'x' })).rejects.toThrow();
  });
});

describe('LocalSettingsRepository', () => {
  it('starts from defaults and persists updates', async () => {
    const db = new FakeDatabase();
    const repo = new LocalSettingsRepository(db.asDatabase());
    await repo.load();
    expect(repo.getSnapshot()).toEqual(DEFAULT_SETTINGS);

    await repo.update({ soundEnabled: false, frameColor: 'cream' });
    const restarted = new LocalSettingsRepository(db.asDatabase());
    await restarted.load();
    expect(restarted.getSnapshot()).toMatchObject({ soundEnabled: false, frameColor: 'cream' });
  });

  it('falls back to defaults for corrupted or mistyped values', async () => {
    const db = new FakeDatabase();
    db.settings.set('soundEnabled', '{not json');
    db.settings.set('hapticsEnabled', '"yes"');
    db.settings.set('unknownKey', 'true');
    const repo = new LocalSettingsRepository(db.asDatabase());
    await repo.load();
    expect(repo.getSnapshot()).toEqual(DEFAULT_SETTINGS);
  });
});
