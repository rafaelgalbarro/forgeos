/** Program 4000 — Validation session (client-side). */

import type { FounderZeroSession } from "./types";

const SESSION_KEY = "forgeos-founder-zero-session";

export function readFounderZeroSession(defaultVentureId: string): FounderZeroSession {
  if (typeof window === "undefined") {
    return { ventureId: defaultVentureId, lastRunAt: null, runCount: 0 };
  }
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return { ventureId: defaultVentureId, lastRunAt: null, runCount: 0 };
    return JSON.parse(raw) as FounderZeroSession;
  } catch {
    return { ventureId: defaultVentureId, lastRunAt: null, runCount: 0 };
  }
}

export function writeFounderZeroSession(session: FounderZeroSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function touchFounderZeroSession(ventureId: string): FounderZeroSession {
  const prev = readFounderZeroSession(ventureId);
  const next: FounderZeroSession = {
    ventureId,
    lastRunAt: new Date().toISOString(),
    runCount: prev.runCount + 1,
  };
  writeFounderZeroSession(next);
  return next;
}
