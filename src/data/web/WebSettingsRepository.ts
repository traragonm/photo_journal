import { DEFAULT_SETTINGS, sanitizeSettings, type AppSettings } from '@/models';
import type { ISettingsRepository } from '../contracts';
import { Observable } from '../Observable';
import { dbGetAll, dbPutMany, SETTINGS_STORE } from './indexedDb';

interface SettingRecord {
  key: string;
  value: unknown;
}

/** Key/value settings persisted in the IndexedDB `settings` store. */
export class WebSettingsRepository extends Observable<AppSettings> implements ISettingsRepository {
  protected snapshot: AppSettings = DEFAULT_SETTINGS;

  async load(): Promise<void> {
    const records = await dbGetAll<SettingRecord>(SETTINGS_STORE);
    const next: AppSettings = { ...DEFAULT_SETTINGS };
    for (const { key, value } of records) {
      if (!(key in DEFAULT_SETTINGS)) continue;
      const settingKey = key as keyof AppSettings;
      // Corrupted / wrongly-typed value: keep the default for that key.
      if (typeof value === typeof DEFAULT_SETTINGS[settingKey]) {
        (next as Record<keyof AppSettings, unknown>)[settingKey] = value;
      }
    }
    this.setSnapshot(sanitizeSettings(next));
  }

  async update(patch: Partial<AppSettings>): Promise<void> {
    const entries = Object.entries(patch) as [keyof AppSettings, AppSettings[keyof AppSettings]][];
    if (entries.length === 0) return;
    const previous = this.snapshot;
    this.setSnapshot({ ...previous, ...patch }); // optimistic
    try {
      await dbPutMany<SettingRecord>(
        SETTINGS_STORE,
        entries.map(([key, value]) => ({ key, value })),
      );
    } catch (error) {
      this.setSnapshot(previous);
      throw error;
    }
  }
}
