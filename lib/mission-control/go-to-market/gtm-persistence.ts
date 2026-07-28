/** GTM package persistence — localStorage per missionId. */

import type { GTMPackage } from "./types";

const STORAGE_PREFIX = "forgeos-gtm-";

function storageKey(missionId: string): string {
  return `${STORAGE_PREFIX}${missionId}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function readGTMPackage(missionId: string): GTMPackage | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(storageKey(missionId));
    if (!raw) return null;
    return JSON.parse(raw) as GTMPackage;
  } catch {
    return null;
  }
}

export function writeGTMPackage(pkg: GTMPackage): void {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey(pkg.missionId), JSON.stringify(pkg));
}

export function clearGTMPackage(missionId: string): void {
  if (!isBrowser()) return;
  localStorage.removeItem(storageKey(missionId));
}
