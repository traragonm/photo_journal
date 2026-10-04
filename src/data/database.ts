import * as SQLite from 'expo-sqlite';

export const DATABASE_NAME = 'photo-diary.db';

/**
 * Ordered migrations. Index + 1 is the schema version stored in PRAGMA user_version.
 * Never edit a shipped migration; append a new one instead.
 */
const MIGRATIONS: readonly string[] = [
  `
  CREATE TABLE IF NOT EXISTS photos (
    id TEXT PRIMARY KEY NOT NULL,
    file_name TEXT NOT NULL,
    created_at TEXT NOT NULL,
    latitude REAL,
    longitude REAL,
    location_name TEXT,
    caption TEXT,
    camera_type TEXT NOT NULL DEFAULT 'back',
    width INTEGER,
    height INTEGER,
    updated_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_photos_created_at ON photos (created_at DESC);
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY NOT NULL,
    value TEXT NOT NULL
  );
  `,
  // v2: print format + film filter chosen at capture.
  `
  ALTER TABLE photos ADD COLUMN frame_type TEXT NOT NULL DEFAULT 'square';
  ALTER TABLE photos ADD COLUMN filter TEXT NOT NULL DEFAULT 'original';
  `,
  // v3: weather + mood noted on the camera drums (NULL for older photos).
  `
  ALTER TABLE photos ADD COLUMN weather TEXT;
  ALTER TABLE photos ADD COLUMN mood TEXT;
  `,
];

async function migrate(db: SQLite.SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA journal_mode = WAL;');
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version');
  const currentVersion = row?.user_version ?? 0;
  if (currentVersion >= MIGRATIONS.length) return;

  for (let version = currentVersion; version < MIGRATIONS.length; version++) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(MIGRATIONS[version]);
    });
    // PRAGMA cannot be parameterised; value is a trusted integer.
    await db.execAsync(`PRAGMA user_version = ${version + 1}`);
  }
}

export async function openDatabase(name: string = DATABASE_NAME): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(name);
  await migrate(db);
  return db;
}
