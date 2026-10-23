/**
 * High-impact news filter (manual §Controles): no NEW entries 15 min before/after high-impact
 * events of the instrument's currencies; 30 min for central banks / press conferences.
 * Open positions keep their stop and exits. Source: public weekly calendar (ForexFactory JSON),
 * cached 3 h in memory and on disk. If the calendar cannot be loaded for 24 h → entries blocked.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { fxBotDir } from "./journal";

export type NewsEvent = { title: string; currency: string; at: number; impact: string };

const URL = process.env.FOREX_NEWS_URL ?? "https://nfs.faireconomy.media/ff_calendar_thisweek.json";
const CB = /(rate|monetary policy|statement|press conference|minutes|testimony|speaks|speech)/i;
let mem: { at: number; events: NewsEvent[] } | null = null;

function file(): string {
  return path.join(fxBotDir(), "news-cache.json");
}

export function instrumentCurrencies(instrument: string): string[] {
  const i = instrument.toUpperCase();
  if (i.includes("_")) return i.split("_");
  if (i === "DE30" || i === "DE40") return ["EUR"];
  return ["USD"]; // gold, oil, US indices
}

export async function loadNews(now = Date.now()): Promise<{ events: NewsEvent[]; ageMs: number } | null> {
  if (mem && now - mem.at < 3 * 3600_000) return { events: mem.events, ageMs: now - mem.at };
  try {
    const res = await fetch(URL, { signal: AbortSignal.timeout(15_000), headers: { "User-Agent": "forgeos-bot" } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = (await res.json()) as Array<{ title: string; country: string; date: string; impact: string }>;
    const events = raw
      .filter((e) => e.impact === "High")
      .map((e) => ({ title: e.title, currency: e.country.toUpperCase(), at: Date.parse(e.date), impact: e.impact }))
      .filter((e) => Number.isFinite(e.at));
    mem = { at: now, events };
    fs.writeFileSync(file(), JSON.stringify(mem));
    return { events, ageMs: 0 };
  } catch {
    try {
      const disk = JSON.parse(fs.readFileSync(file(), "utf8")) as { at: number; events: NewsEvent[] };
      mem = mem ?? disk;
      return { events: disk.events, ageMs: now - disk.at };
    } catch {
      return null;
    }
  }
}

/** null = free to enter; otherwise the reason. */
export function newsBlockReason(instrument: string, events: NewsEvent[] | null, ageMs: number, now = Date.now()): string | null {
  if (!events || ageMs > 24 * 3600_000) return "calendario de noticias no disponible";
  const ccys = instrumentCurrencies(instrument);
  for (const e of events) {
    if (!ccys.includes(e.currency)) continue;
    const win = (CB.test(e.title) ? 30 : 15) * 60_000;
    if (Math.abs(now - e.at) <= win) return `noticia ${e.currency} «${e.title.slice(0, 40)}»`;
  }
  return null;
}
