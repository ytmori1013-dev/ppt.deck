/**
 * IndexedDB-backed store for multiple saved decks ("sessions").
 *
 * Why not localStorage: pasted/【GPT】 images are stored as base64 data URLs,
 * which quickly blow past the ~5MB localStorage quota. IndexedDB handles large
 * blobs comfortably. Falls back to localStorage when IndexedDB is unavailable.
 *
 * Layout (all in one key/value store):
 *   "decks:index"  -> DeckMeta[]            (lightweight list for the switcher)
 *   "deck:<id>"    -> the full Persisted deck payload (may be large w/ images)
 *   "active"       -> the id of the deck currently open
 * A legacy single-deck value under "deck" is migrated into a session on load.
 */
const DB_NAME = "consult-deck-ai";
const STORE = "kv";
const LEGACY_KEY = "deck";
const INDEX_KEY = "decks:index";
const ACTIVE_KEY = "active";

export type DeckMeta = { id: string; name: string; updatedAt: number };

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

// --- low-level key/value (IndexedDB with localStorage fallback) ------------

async function kvPut(key: string, value: unknown): Promise<void> {
  if (typeof indexedDB === "undefined") {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* quota exceeded — ignore */
    }
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function kvGet<T>(key: string): Promise<T | null> {
  if (typeof indexedDB === "undefined") {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  const db = await openDb();
  const result = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}

async function kvDelete(key: string): Promise<void> {
  if (typeof indexedDB === "undefined") {
    try {
      localStorage.removeItem(key);
    } catch {
      /* ignore */
    }
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

// --- deck (session) API ----------------------------------------------------

export function newDeckId(): string {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export async function listDecks(): Promise<DeckMeta[]> {
  await migrateLegacy();
  const index = (await kvGet<DeckMeta[]>(INDEX_KEY)) ?? [];
  return [...index].sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function loadDeckById<T>(id: string): Promise<T | null> {
  return kvGet<T>(`deck:${id}`);
}

export async function saveDeckById(id: string, name: string, payload: unknown): Promise<void> {
  await kvPut(`deck:${id}`, payload);
  const index = (await kvGet<DeckMeta[]>(INDEX_KEY)) ?? [];
  const next = index.filter((d) => d.id !== id);
  next.push({ id, name, updatedAt: Date.now() });
  await kvPut(INDEX_KEY, next);
}

export async function deleteDeckById(id: string): Promise<void> {
  await kvDelete(`deck:${id}`);
  const index = (await kvGet<DeckMeta[]>(INDEX_KEY)) ?? [];
  await kvPut(INDEX_KEY, index.filter((d) => d.id !== id));
}

export async function getActiveDeckId(): Promise<string | null> {
  return kvGet<string>(ACTIVE_KEY);
}

export async function setActiveDeckId(id: string): Promise<void> {
  await kvPut(ACTIVE_KEY, id);
}

/** One-time migration: fold a legacy single "deck" value into a session. */
async function migrateLegacy(): Promise<void> {
  const index = await kvGet<DeckMeta[]>(INDEX_KEY);
  if (index) return; // already on the multi-deck layout
  const legacy = await kvGet<unknown>(LEGACY_KEY);
  if (legacy) {
    const id = newDeckId();
    await kvPut(`deck:${id}`, legacy);
    await kvPut(INDEX_KEY, [{ id, name: "資料 1", updatedAt: Date.now() }]);
    await kvPut(ACTIVE_KEY, id);
    await kvDelete(LEGACY_KEY);
  } else {
    await kvPut(INDEX_KEY, []);
  }
}
