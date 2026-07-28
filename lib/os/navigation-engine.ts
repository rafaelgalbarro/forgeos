/** ForgeOS OS — navigation engine: history, favorites, pinned apps (RC2). */

import type { OsModuleId } from "./types";
import { OS_NAV_ITEMS } from "./navigation";

const PINNED_KEY = "forgeos-os-pinned";
const FAVORITES_KEY = "forgeos-os-favorites";
const HISTORY_KEY = "forgeos-os-history";
const MAX_HISTORY = 20;

export interface OsNavHistoryEntry {
  href: string;
  label: string;
  at: string;
}

function readJson<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore quota */
  }
}

export function getDefaultPinnedIds(): OsModuleId[] {
  return OS_NAV_ITEMS.filter((i) => i.pinned).map((i) => i.id);
}

export function getPinnedModuleIds(): OsModuleId[] {
  const stored = readJson<OsModuleId[] | null>(PINNED_KEY, null);
  return stored ?? getDefaultPinnedIds();
}

export function setPinnedModuleIds(ids: OsModuleId[]): void {
  writeJson(PINNED_KEY, ids);
}

export function getFavoriteHrefs(): string[] {
  return readJson<string[]>(FAVORITES_KEY, []);
}

export function toggleFavorite(href: string): string[] {
  const current = getFavoriteHrefs();
  const next = current.includes(href) ? current.filter((h) => h !== href) : [...current, href];
  writeJson(FAVORITES_KEY, next);
  return next;
}

export function getNavHistory(): OsNavHistoryEntry[] {
  return readJson<OsNavHistoryEntry[]>(HISTORY_KEY, []);
}

export function pushNavHistory(href: string, label: string): OsNavHistoryEntry[] {
  const entry: OsNavHistoryEntry = { href, label, at: new Date().toISOString() };
  const prev = getNavHistory().filter((e) => e.href !== href);
  const next = [entry, ...prev].slice(0, MAX_HISTORY);
  writeJson(HISTORY_KEY, next);
  return next;
}
