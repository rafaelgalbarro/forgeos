/**
 * FOREX macro calendar — HIGH-impact blackout window (±30m).
 * Server-only (fs cache); do not import from client components or the forex barrel.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { FOREX_RISK_POLICY } from "./config";

const CACHE_DIR = path.join(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "forex-macro-calendar.json");

const HIGH_KEYWORDS =
  /\b(NFP|non[- ]?farm|CPI|FOMC|Fed\b|ECB|BCE|interest rate|payroll|GDP|unemployment|PPI|ISM)\b/i;

export type ForexMacroEvent = {
  readonly title: string;
  readonly at: string;
  readonly highImpact: boolean;
};

export type ForexMacroSnapshot = {
  readonly generatedAt: string;
  readonly events: readonly ForexMacroEvent[];
  readonly blackoutActive: boolean;
  readonly nextHighImpactAt: string | null;
  readonly minutesToNextHigh: number | null;
};

async function fetchJson<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getForexMacroSnapshot(now = new Date()): Promise<ForexMacroSnapshot> {
  const today = now.toISOString().slice(0, 10);
  let events: ForexMacroEvent[] = [];

  try {
    if (fs.existsSync(CACHE_FILE)) {
      const cached = JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as {
        dateKey?: string;
        events?: ForexMacroEvent[];
      };
      if (cached.dateKey === today && Array.isArray(cached.events)) {
        events = cached.events;
      }
    }
  } catch {
    /* refresh */
  }

  if (events.length === 0) {
    const url = `https://www.econdb.com/api/events/?format=json&date_from=${today}`;
    const data = await fetchJson<Array<{ event?: string; title?: string; date?: string }>>(url);
    events = (data ?? [])
      .map((ev) => {
        const title = `${ev.event ?? ""} ${ev.title ?? ""}`.trim() || "Macro event";
        const at = ev.date ? new Date(ev.date).toISOString() : now.toISOString();
        return { title, at, highImpact: HIGH_KEYWORDS.test(title) };
      })
      .slice(0, 40);
    try {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      fs.writeFileSync(
        CACHE_FILE,
        JSON.stringify({ dateKey: today, updatedAt: now.toISOString(), events }, null, 2),
        "utf8",
      );
    } catch {
      /* ignore cache write */
    }
  }

  const blackoutMs = FOREX_RISK_POLICY.newsBlackoutMinutes * 60_000;
  const t = now.getTime();
  let blackoutActive = false;
  let nextHighImpactAt: string | null = null;
  let minutesToNextHigh: number | null = null;

  for (const ev of events) {
    if (!ev.highImpact) continue;
    const when = new Date(ev.at).getTime();
    if (!Number.isFinite(when)) continue;
    if (Math.abs(when - t) <= blackoutMs) blackoutActive = true;
    if (when >= t) {
      if (!nextHighImpactAt || when < new Date(nextHighImpactAt).getTime()) {
        nextHighImpactAt = ev.at;
        minutesToNextHigh = Math.round((when - t) / 60_000);
      }
    }
  }

  return {
    generatedAt: now.toISOString(),
    events,
    blackoutActive,
    nextHighImpactAt,
    minutesToNextHigh,
  };
}
