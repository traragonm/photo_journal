import type { SQLiteDatabase } from 'expo-sqlite';
import { DEFAULT_SETTINGS, sanitizeSettings, type AppSettings } from '@/models';
import { Observable } from './Observable';

import type { ISettingsRepository } from './contracts';

export type { ISettingsRepository };

/** Key/value settings persisted as JSON values in the `settings` table. */
export class LocalSettingsRepository extends Observable<AppSettings> implements ISettingsRepository {
  protected snapshot: AppSettings = DEFAULT_SETTINGS;

  constructor(private readonly db: SQLiteDatabase) {
    super();
  }

  async load(): Promise<void> {
    const rows = await this.db.getAllAsync<{ key: string; value: string }>(
      'SELECT key, value FROM settings',
    );
    const next: AppSettings = { ...DEFAULT_SETTINGS };
    for (const { key, value } of rows) {
      if (!(key in DEFAULT_SETTINGS)) continue;
      try {
        const parsed: unknown = JSON.parse(value);
        const settingKey = key as keyof AppSettings;
        if (typeof parsed === typeof DEFAULT_SETTINGS[settingKey]) {
          (next as Record<keyof AppSettings, unknown>)[settingKey] = parsed;
        }
      } catch {
        // Corrupted value: fall back to default for that key.
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
      await this.db.withTransactionAsync(async () => {
        for (const [key, value] of entries) {
          await this.db.runAsync(
            'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
            key,
            JSON.stringify(value),
          );
        }
      });
    } catch (error) {
      this.setSnapshot(previous);
      throw error;
    }
  }
}
