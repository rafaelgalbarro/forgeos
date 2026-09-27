/**
 * Daily / weekly Kraken risk gates (Europe/Madrid calendar).
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";

const FILE = path.join(process.cwd(), ".forgeos", "cache", "kraken-daily-risk.json");

function madridDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function madridWeekKey(now = new Date()): string {
  // ISO-ish: year-week using Thursday rule simplified via day key
  const day = madridDayKey(now);
  return day.slice(0, 8); // YYYY-MM- for coarse weekly; refine with day number
}

type RiskState = {
  dayKey: string;
  weekKey: string;
  dayStartEquity: number;
  weekStartEquity: number;
  dayPnlEur: number;
  weekPnlEur: number;
  consecutiveStops: number;
  buyPauseUntil: number;
  sizeMult: number;
  exitsOnly: boolean;
  dailyLimitHit: boolean;
};

let state: RiskState | null = null;

function load(): RiskState {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, "utf8")) as RiskState;
    }
  } catch {
    /* ignore */
  }
  return {
    dayKey: "",
    weekKey: "",
    dayStartEquity: 0,
    weekStartEquity: 0,
    dayPnlEur: 0,
    weekPnlEur: 0,
    consecutiveStops: 0,
    buyPauseUntil: 0,
    sizeMult: 1,
    exitsOnly: false,
    dailyLimitHit: false,
  };
}

function save(s: RiskState): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(s, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

export function syncKrakenDailyRisk(equityEur: number): RiskState {
  const s = state ?? load();
  const day = madridDayKey();
  const week = madridWeekKey();
  if (s.dayKey !== day) {
    s.dayKey = day;
    s.dayStartEquity = equityEur;
    s.dayPnlEur = 0;
    s.sizeMult = 1;
    s.exitsOnly = false;
    s.dailyLimitHit = false;
    s.consecutiveStops = 0;
  }
  if (s.weekKey !== week.slice(0, 7)) {
    s.weekKey = week.slice(0, 7);
    s.weekStartEquity = equityEur;
    s.weekPnlEur = 0;
  }
  if (!(s.dayStartEquity > 0)) s.dayStartEquity = equityEur;
  if (!(s.weekStartEquity > 0)) s.weekStartEquity = equityEur;
  s.dayPnlEur = equityEur - s.dayStartEquity;
  s.weekPnlEur = equityEur - s.weekStartEquity;

  const dayPct = s.dayStartEquity > 0 ? s.dayPnlEur / s.dayStartEquity : 0;
  const weekPct = s.weekStartEquity > 0 ? s.weekPnlEur / s.weekStartEquity : 0;

  if (dayPct <= -0.03 && !s.dailyLimitHit) {
    s.dailyLimitHit = true;
    s.exitsOnly = true;
    void sendTelegramMessage(
      `🛑 LÍMITE DIARIO Kraken — P&L día ${(dayPct * 100).toFixed(2)}% (≤ −3%). Sin compras hasta mañana.`,
    ).catch(() => undefined);
  }
  if (dayPct >= 0.05) {
    s.exitsOnly = true;
    s.sizeMult = 0;
  } else if (dayPct >= 0.03) {
    s.sizeMult = 0.5;
  }

  if (weekPct <= -0.08) {
    s.buyPauseUntil = Math.max(s.buyPauseUntil, Date.now() + 48 * 3600_000);
    void sendTelegramMessage(
      `🛑 Pérdida semanal Kraken ${(weekPct * 100).toFixed(1)}% > 8% — pausa compras 48h`,
    ).catch(() => undefined);
  }

  state = s;
  save(s);
  return s;
}

export function recordKrakenStopHit(): void {
  const s = state ?? load();
  s.consecutiveStops += 1;
  if (s.consecutiveStops >= 3) {
    s.buyPauseUntil = Math.max(s.buyPauseUntil, Date.now() + 2 * 3600_000);
    s.consecutiveStops = 0;
    void sendTelegramMessage("⏸ Kraken: 3 stops seguidos → pausa compras 2h").catch(
      () => undefined,
    );
  }
  state = s;
  save(s);
}

export function recordKrakenWinResetStops(): void {
  const s = state ?? load();
  s.consecutiveStops = 0;
  state = s;
  save(s);
}

export function getKrakenDailyRisk(): RiskState {
  return state ?? load();
}

export function canOpenKrakenBuy(): { ok: boolean; reason?: string; sizeMult: number } {
  const s = state ?? load();
  if (s.dailyLimitHit || s.exitsOnly) {
    return { ok: false, reason: "límite diario / solo salidas", sizeMult: 0 };
  }
  if (Date.now() < s.buyPauseUntil) {
    return { ok: false, reason: "pausa compras activa", sizeMult: 0 };
  }
  return { ok: true, sizeMult: s.sizeMult > 0 ? s.sizeMult : 1 };
}
