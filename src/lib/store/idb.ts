/**
 * Minimal IndexedDB key/value store for the working deck.
 *
 * Why not localStorage: pasted GPT images are stored as base64 data URLs, which
 * quickly blow past the ~5MB localStorage quota. IndexedDB handles large blobs
 * comfortably. Falls back to localStorage when IndexedDB is unavailable.
 */
const DB_NAME = "consult-deck-ai";
const STORE = "kv";
const KEY = "deck";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveDeck(value: unknown): Promise<void> {
  if (typeof indexedDB === "undefined") {
    try {
      localStorage.setItem(KEY, JSON.stringify(value));
    } catch {
      /* quota exceeded — ignore */
    }
    return;
  }
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function loadDeck<T>(): Promise<T | null> {
  if (typeof indexedDB === "undefined") {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? (JSON.parse(raw) as T) : null;
    } catch {
      return null;
    }
  }
  const db = await openDb();
  const result = await new Promise<T | null>((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve((req.result as T) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return result;
}
