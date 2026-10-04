import type { SQLiteDatabase } from 'expo-sqlite';
import type { ImageStorage } from '../ImageStorage';

type Row = Record<string, unknown>;

/**
 * In-memory stand-in for the subset of SQLiteDatabase the repositories use.
 * Statements are matched by prefix; enough to exercise repository logic.
 */
export class FakeDatabase {
  photos = new Map<string, Row>();
  settings = new Map<string, string>();
  failNextInsert = false;

  async getAllAsync<T>(sql: string): Promise<T[]> {
    if (sql.includes('FROM photos')) {
      return [...this.photos.values()].sort((a, b) =>
        String(b.created_at).localeCompare(String(a.created_at)),
      ) as T[];
    }
    if (sql.includes('FROM settings')) {
      return [...this.settings.entries()].map(([key, value]) => ({ key, value })) as T[];
    }
    throw new Error(`Unhandled query: ${sql}`);
  }

  async getFirstAsync<T>(sql: string, id: string): Promise<T | null> {
    if (sql.includes('FROM photos WHERE id')) return (this.photos.get(id) as T) ?? null;
    throw new Error(`Unhandled query: ${sql}`);
  }

  async runAsync(sql: string, ...params: unknown[]): Promise<{ changes: number }> {
    const statement = sql.trim();
    if (statement.startsWith('INSERT OR IGNORE INTO photos')) {
      if (this.failNextInsert) {
        this.failNextInsert = false;
        throw new Error('disk full');
      }
      const [id, file_name, created_at, latitude, longitude, location_name, caption, camera_type, frame_type, filter, weather, mood, width, height] =
        params;
      if (this.photos.has(String(id))) return { changes: 0 };
      this.photos.set(String(id), {
        id, file_name, created_at, latitude, longitude, location_name, caption, camera_type, frame_type, filter, weather, mood, width, height,
      });
      return { changes: 1 };
    }
    if (statement.startsWith('UPDATE photos SET')) {
      // "UPDATE photos SET a = ?, b = ?, updated_at = ? WHERE id = ?"
      const columns = statement
        .slice('UPDATE photos SET'.length, statement.indexOf('WHERE'))
        .split(',')
        .map((part) => part.split('=')[0].trim());
      const id = params[params.length - 1];
      const row = this.photos.get(String(id));
      if (row) columns.forEach((column, i) => (row[column] = params[i]));
      return { changes: row ? 1 : 0 };
    }
    if (statement === 'DELETE FROM photos WHERE id = ?') {
      return { changes: this.photos.delete(String(params[0])) ? 1 : 0 };
    }
    if (statement === 'DELETE FROM photos') {
      const changes = this.photos.size;
      this.photos.clear();
      return { changes };
    }
    if (statement.startsWith('INSERT INTO settings')) {
      this.settings.set(String(params[0]), String(params[1]));
      return { changes: 1 };
    }
    throw new Error(`Unhandled statement: ${sql}`);
  }

  async withTransactionAsync(task: () => Promise<void>): Promise<void> {
    await task();
  }

  asDatabase(): SQLiteDatabase {
    return this as unknown as SQLiteDatabase;
  }
}

/** In-memory ImageStorage: "files" are names in a Set; sources are temp uris. */
export class FakeImageStorage {
  files = new Set<string>();
  missingSources = new Set<string>();

  ensureReady(): void {}
  fileNameFor(id: string): string {
    return `${id}.jpg`;
  }
  resolveUri(fileName: string): string {
    return `file:///docs/photos/${fileName}`;
  }
  exists(fileName: string): boolean {
    return this.files.has(fileName);
  }
  async persist(sourceUri: string, id: string): Promise<string> {
    if (this.missingSources.has(sourceUri)) throw new Error('Captured image is missing or empty.');
    const name = this.fileNameFor(id);
    this.files.add(name);
    return name;
  }
  delete(fileName: string): void {
    this.files.delete(fileName);
  }
  listFileNames(): string[] {
    return [...this.files];
  }
  deleteAll(): void {
    this.files.clear();
  }

  asStorage(): ImageStorage {
    return this as unknown as ImageStorage;
  }
}
