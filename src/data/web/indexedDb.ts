export const DB_NAME = 'photo-diary';
export const DB_VERSION = 1;
export const PHOTOS_STORE = 'photos';
export const SETTINGS_STORE = 'settings';

export type StoreName = typeof PHOTOS_STORE | typeof SETTINGS_STORE;

const STORE_KEY_PATHS: Record<StoreName, string> = {
  [PHOTOS_STORE]: 'id',
  [SETTINGS_STORE]: 'key',
};

const UNAVAILABLE_MESSAGE =
  'Browser storage (IndexedDB) is unavailable. Private browsing or blocked site data may be the cause.';

/** Turns any IndexedDB failure into an Error with a message the boot retry screen can show. */
function toError(error: unknown, fallback: string): Error {
  if (error instanceof DOMException && error.name === 'QuotaExceededError') {
    return new Error('Browser storage is full. Free up space and try again.');
  }
  if (error instanceof Error && error.message) return error;
  return new Error(fallback);
}

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(toError(req.error, 'Browser storage request failed.'));
  });
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(toError(tx.error, 'Browser storage transaction failed.'));
    tx.onabort = () => reject(toError(tx.error, 'Browser storage transaction was aborted.'));
  });
}

let dbPromise: Promise<IDBDatabase> | null = null;

function openRaw(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error(UNAVAILABLE_MESSAGE));
      return;
    }
    let req: IDBOpenDBRequest;
    try {
      req = indexedDB.open(DB_NAME, DB_VERSION);
    } catch (error) {
      reject(toError(error, UNAVAILABLE_MESSAGE));
      return;
    }
    req.onupgradeneeded = () => {
      const db = req.result;
      for (const store of Object.keys(STORE_KEY_PATHS) as StoreName[]) {
        if (!db.objectStoreNames.contains(store)) {
          db.createObjectStore(store, { keyPath: STORE_KEY_PATHS[store] });
        }
      }
    };
    req.onsuccess = () => {
      const db = req.result;
      // Another tab upgraded or the browser evicted the connection: reopen on next use.
      db.onclose = () => {
        dbPromise = null;
      };
      db.onversionchange = () => {
        db.close();
        dbPromise = null;
      };
      resolve(db);
    };
    req.onerror = () => reject(toError(req.error, UNAVAILABLE_MESSAGE));
    req.onblocked = () => reject(new Error('Browser storage is blocked by another open tab.'));
  });
}

/** Opens (once) and returns the shared connection. A failed open is retried on the next call. */
export function openDatabase(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = openRaw().catch((error: unknown) => {
      dbPromise = null;
      throw error;
    });
  }
  return dbPromise;
}

/** Closes the cached connection (tests / explicit reset). */
export async function closeDatabase(): Promise<void> {
  if (!dbPromise) return;
  const pending = dbPromise;
  dbPromise = null;
  (await pending.catch(() => null))?.close();
}

export async function dbGet<T>(store: StoreName, key: string): Promise<T | undefined> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readonly');
  const result = await request<T | undefined>(tx.objectStore(store).get(key));
  return result;
}

export async function dbGetAll<T>(store: StoreName): Promise<T[]> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readonly');
  return request<T[]>(tx.objectStore(store).getAll());
}

export async function dbPut<T>(store: StoreName, value: T): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).put(value);
  await transactionDone(tx);
}

/** Writes several values atomically (all or nothing). */
export async function dbPutMany<T>(store: StoreName, values: readonly T[]): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  for (const value of values) objectStore.put(value);
  await transactionDone(tx);
}

/**
 * Atomic read-modify-write of one record. Resolves with the stored value, or undefined if the
 * record does not exist.
 */
export async function dbUpdate<T>(
  store: StoreName,
  key: string,
  mutate: (current: T) => T,
): Promise<T | undefined> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  const objectStore = tx.objectStore(store);
  const current = await request<T | undefined>(objectStore.get(key));
  if (current === undefined) {
    await transactionDone(tx);
    return undefined;
  }
  const next = mutate(current);
  objectStore.put(next);
  await transactionDone(tx);
  return next;
}

export async function dbDelete(store: StoreName, key: string): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).delete(key);
  await transactionDone(tx);
}

export async function dbClear(store: StoreName): Promise<void> {
  const db = await openDatabase();
  const tx = db.transaction(store, 'readwrite');
  tx.objectStore(store).clear();
  await transactionDone(tx);
}
