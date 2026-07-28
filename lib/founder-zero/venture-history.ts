/** Program 4000 — Validation run history. */

import type { ValidationHistoryEntry } from "./types";

const HISTORY_KEY = "forgeos-founder-zero-history";
const MAX_ENTRIES = 20;

export function readValidationHistory(): ValidationHistoryEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as ValidationHistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function appendValidationHistory(entry: Omit<ValidationHistoryEntry, "id">): ValidationHistoryEntry[] {
  const full: ValidationHistoryEntry = { ...entry, id: crypto.randomUUID() };
  const prev = readValidationHistory();
  const next = [full, ...prev].slice(0, MAX_ENTRIES);
  if (typeof window !== "undefined") {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  }
  return next;
}

export function clearValidationHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(HISTORY_KEY);
}
