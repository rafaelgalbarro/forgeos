/** Local persistence adapter — localStorage with IndexedDB fallback for large payloads. */

import type { PersistenceAdapter } from "./adapter-types";

const IDB_NAME = "forgeos-persistence";
const IDB_STORE = "kv";
const LARGE_THRESHOLD = 512_000;

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function readLocal<T>(key: string, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLocal<T>(key: string, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

function removeLocal(key: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(key);
}

function listLocalKeys(prefix?: string): string[] {
  if (!isBrowser()) return [];
  const keys: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && (!prefix || k.startsWith(prefix))) keys.push(k);
  }
  return keys;
}

async function openIdb(): Promise<IDBDatabase | null> {
  if (!isBrowser() || !("indexedDB" in window)) return null;
  return new Promise((resolve) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(null);
  });
}

async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openIdb();
  if (!db) return undefined;
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readonly");
    const req = tx.objectStore(IDB_STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => resolve(undefined);
  });
}

async function idbSet<T>(key: string, value: T): Promise<void> {
  const db = await openIdb();
  if (!db) return;
  return new Promise((resolve) => {
    const tx = db.transaction(IDB_STORE, "readwrite");
    tx.objectStore(IDB_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
  });
}

export class LocalAdapter implements PersistenceAdapter {
  readonly provider = "local" as const;

  isAvailable(): boolean {
    return isBrowser();
  }

  async read<T>(key: string, fallback: T): Promise<T> {
    if (!isBrowser()) return fallback;

    const idbVal = await idbGet<T>(`${key}:idb`);
    if (idbVal !== undefined) return idbVal;

    return readLocal(key, fallback);
  }

  async write<T>(key: string, value: T): Promise<void> {
    if (!isBrowser()) return;

    const serialized = JSON.stringify(value);
    if (serialized.length > LARGE_THRESHOLD) {
      await idbSet(`${key}:idb`, value);
      removeLocal(key);
      return;
    }

    writeLocal(key, value);
  }

  async remove(key: string): Promise<void> {
    if (!isBrowser()) return;
    removeLocal(key);
    const db = await openIdb();
    if (db) {
      await new Promise<void>((resolve) => {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(`${key}:idb`);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }
  }

  async keys(prefix?: string): Promise<string[]> {
    return listLocalKeys(prefix);
  }
}

let localAdapterInstance: LocalAdapter | null = null;

export function getLocalAdapter(): LocalAdapter {
  if (!localAdapterInstance) localAdapterInstance = new LocalAdapter();
  return localAdapterInstance;
}
