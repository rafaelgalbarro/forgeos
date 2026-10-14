/**
 * Futures-only daily risk (3% of flex capital) — spot kraken-daily-risk.json untouched.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { sendTelegramMessage } from "@/lib/notifications/telegram-bot";
import { futuresDailyMaxLossPct } from "@/lib/trading/crypto/futures-config";

const FILE = path.join(process.cwd(), ".forgeos", "cache", "kraken-futures-daily-risk.json");

function madridDayKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

type FuturesRiskState = {
  dayKey: string;
  dayStartCapital: number;
  dayPnl: number;
  exitsOnly: boolean;
  dailyLimitHit: boolean;
};

let state: FuturesRiskState | null = null;

function load(): FuturesRiskState {
  try {
    if (fs.existsSync(FILE)) {
      return JSON.parse(fs.readFileSync(FILE, "utf8")) as FuturesRiskState;
    }
  } catch {
    /* ignore */
  }
  return {
    dayKey: "",
    dayStartCapital: 0,
    dayPnl: 0,
    exitsOnly: false,
    dailyLimitHit: false,
  };
}

function save(s: FuturesRiskState): void {
  try {
    fs.mkdirSync(path.dirname(FILE), { recursive: true });
    fs.writeFileSync(FILE, JSON.stringify(s, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

export function syncFuturesDailyRisk(currentCapital: number): FuturesRiskState {
  const s = state ?? load();
  const day = madridDayKey();
  const limit = futuresDailyMaxLossPct();
  if (s.dayKey !== day) {
    s.dayKey = day;
    s.dayStartCapital = currentCapital;
    s.dayPnl = 0;
    s.exitsOnly = false;
    s.dailyLimitHit = false;
  }
  if (!(s.dayStartCapital > 0)) s.dayStartCapital = currentCapital;
  s.dayPnl = currentCapital - s.dayStartCapital;
  const dayPct = s.dayStartCapital > 0 ? s.dayPnl / s.dayStartCapital : 0;
  if (dayPct <= -limit && !s.dailyLimitHit) {
    s.dailyLimitHit = true;
    s.exitsOnly = true;
    void sendTelegramMessage(
      `🛑 LÍMITE DIARIO Kraken Futures — P&L día ${(dayPct * 100).toFixed(2)}% (≤ −${(limit * 100).toFixed(0)}%). Solo salidas.`,
    ).catch(() => undefined);
  }
  state = s;
  save(s);
  return s;
}

export function getFuturesDailyRisk(): FuturesRiskState {
  return state ?? load();
}

export function canOpenFuturesPosition(): { ok: boolean; reason?: string } {
  const s = state ?? load();
  if (s.dailyLimitHit || s.exitsOnly) {
    return { ok: false, reason: "futures límite diario / solo salidas" };
  }
  return { ok: true };
}
