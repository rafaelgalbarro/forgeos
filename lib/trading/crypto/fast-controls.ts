/**
 * Fast-strategy risk controls: max 1 open, 15 trades/day, pause after 3 stops.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { isFastCryptoStrategy } from "@/lib/trading/crypto/strategies/types";
import { listOpenCryptoJournal } from "@/lib/trading/crypto/journal-crypto";

function forgeosRoot(): string {
  return process.env.FORGEOS_ROOT?.trim() || process.cwd();
}

function FILE(): string {
  return path.join(forgeosRoot(), ".forgeos", "cache", "kraken-fast-controls.json");
}

function madridDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

type FastState = {
  dayKey: string;
  tradesToday: number;
  consecutiveStops: number;
  pauseUntil: number;
};

function load(): FastState {
  try {
    if (fs.existsSync(FILE())) {
      return JSON.parse(fs.readFileSync(FILE(), "utf8")) as FastState;
    }
  } catch {
    /* ignore */
  }
  return { dayKey: "", tradesToday: 0, consecutiveStops: 0, pauseUntil: 0 };
}

function save(s: FastState): void {
  try {
    fs.mkdirSync(path.dirname(FILE()), { recursive: true });
    fs.writeFileSync(FILE(), JSON.stringify(s, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

function rollDay(s: FastState): FastState {
  const day = madridDayKey();
  if (s.dayKey !== day) {
    s.dayKey = day;
    s.tradesToday = 0;
    s.consecutiveStops = 0;
  }
  return s;
}

export function countOpenFastPositions(): number {
  return listOpenCryptoJournal({ shadow: false }).filter((t) =>
    isFastCryptoStrategy(String(t.strategy)),
  ).length;
}

export function canOpenFastTrade(): { ok: boolean; reason?: string } {
  const s = rollDay(load());
  save(s);
  if (Date.now() < s.pauseUntil) {
    return { ok: false, reason: "pausa 2h tras 3 stops fast" };
  }
  if (s.tradesToday >= 15) {
    return { ok: false, reason: "máx 15 trades fast/día" };
  }
  if (countOpenFastPositions() >= 1) {
    return { ok: false, reason: "máx 1 posición fast abierta" };
  }
  return { ok: true };
}

export function recordFastTradeOpened(): void {
  const s = rollDay(load());
  s.tradesToday += 1;
  save(s);
}

export function recordFastStop(): void {
  const s = rollDay(load());
  s.consecutiveStops += 1;
  if (s.consecutiveStops >= 3) {
    s.pauseUntil = Math.max(s.pauseUntil, Date.now() + 2 * 3600_000);
    s.consecutiveStops = 0;
  }
  save(s);
}

export function recordFastWin(): void {
  const s = rollDay(load());
  s.consecutiveStops = 0;
  save(s);
}

export function getFastControlsState(): FastState {
  return rollDay(load());
}
