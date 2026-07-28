import type { StorageKey } from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readStorage<T>(key: StorageKey, fallback: T): T {
  if (!isBrowser()) return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function writeStorage<T>(key: StorageKey, value: T): void {
  if (!isBrowser()) return;
  localStorage.setItem(key, JSON.stringify(value));
}

export function upsertInMap<T extends { ventureId: string }>(
  key: StorageKey,
  record: T
): void {
  const map = readStorage<Record<string, T>>(key, {});
  map[record.ventureId] = record;
  writeStorage(key, map);
}

export function getFromMap<T>(key: StorageKey, id: string): T | undefined {
  const map = readStorage<Record<string, T>>(key, {});
  return map[id];
}

export function getAllFromMap<T>(key: StorageKey): T[] {
  const map = readStorage<Record<string, T>>(key, {});
  return Object.values(map);
}

export function appendToList<T>(key: StorageKey, item: T): void {
  const list = readStorage<T[]>(key, []);
  list.push(item);
  writeStorage(key, list);
}

export function updateInList<T extends { id: string }>(
  key: StorageKey,
  id: string,
  updater: (item: T) => T
): T | undefined {
  const list = readStorage<T[]>(key, []);
  const i = list.findIndex((item) => item.id === id);
  if (i < 0) return undefined;
  list[i] = updater(list[i]);
  writeStorage(key, list);
  return list[i];
}

export function findInList<T extends { id: string }>(
  key: StorageKey,
  id: string
): T | undefined {
  return readStorage<T[]>(key, []).find((item) => item.id === id);
}

export function filterListByVenture<T extends { ventureId: string }>(
  key: StorageKey,
  ventureId: string
): T[] {
  return readStorage<T[]>(key, []).filter((item) => item.ventureId === ventureId);
}
