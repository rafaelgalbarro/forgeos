/** Client-side Digital CEO persistence — per mission. */

import type { ProactiveCEOState } from "./types";
import { DIGITAL_CEO_STORAGE_PREFIX } from "./types";

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function storageKey(missionId: string): string {
  return `${DIGITAL_CEO_STORAGE_PREFIX}${missionId}`;
}

export function readDigitalCEOState(missionId: string): ProactiveCEOState | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(storageKey(missionId));
    return raw ? (JSON.parse(raw) as ProactiveCEOState) : null;
  } catch {
    return null;
  }
}

export function writeDigitalCEOState(state: ProactiveCEOState): void {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey(state.missionId), JSON.stringify(state));
}

export function todayDateKey(): string {
  return new Date().toISOString().slice(0, 10);
}

export function lastMondayDateKey(ref = new Date()): string {
  const d = new Date(ref);
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return d.toISOString().slice(0, 10);
}

export function isMorningBriefStale(state: ProactiveCEOState | null): boolean {
  if (!state?.lastMorningBriefDate) return true;
  return state.lastMorningBriefDate !== todayDateKey();
}

export function isWeeklyReviewStale(state: ProactiveCEOState | null): boolean {
  if (!state?.lastWeeklyReviewDate) return true;
  return state.lastWeeklyReviewDate !== lastMondayDateKey();
}
