/**
 * FOREX daily goals & session counters (server memory + disk cache).
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { ForexStrategyStyle } from "@/lib/investment/forex/strategies/defs";

export const FOREX_DAILY_GOALS = {
  scalpingTargetPips: 20,
  intradayTargetPips: 50,
  dailyStopPips: -30,
  maxScalpTrades: 10,
  maxIntradayTrades: 5,
  maxRiskPctPerTrade: 1,
  dailyNavStopPct: 3,
  maxConcurrentPairs: 3,
} as const;

export type ForexDailyState = {
  dateKey: string;
  scalpPips: number;
  intradayPips: number;
  scalpTrades: number;
  intradayTrades: number;
  realizedPips: number;
  stoppedOut: boolean;
  goalScalpHit: boolean;
  goalIntradayHit: boolean;
  telegramConfirmRemaining: number;
  updatedAt: string;
};

const CACHE_DIR = path.join(process.cwd(), ".forgeos", "cache");
const CACHE_FILE = path.join(CACHE_DIR, "forex-daily-state.json");

function madridDateKey(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Madrid",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function emptyState(dateKey: string): ForexDailyState {
  return {
    dateKey,
    scalpPips: 0,
    intradayPips: 0,
    scalpTrades: 0,
    intradayTrades: 0,
    realizedPips: 0,
    stoppedOut: false,
    goalScalpHit: false,
    goalIntradayHit: false,
    telegramConfirmRemaining: 5,
    updatedAt: new Date().toISOString(),
  };
}

function readDisk(): ForexDailyState | null {
  try {
    if (!fs.existsSync(CACHE_FILE)) return null;
    return JSON.parse(fs.readFileSync(CACHE_FILE, "utf8")) as ForexDailyState;
  } catch {
    return null;
  }
}

function writeDisk(state: ForexDailyState): void {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    fs.writeFileSync(CACHE_FILE, JSON.stringify(state, null, 2), "utf8");
  } catch {
    /* ignore */
  }
}

let memory: ForexDailyState | null = null;

export function getForexDailyState(now = new Date()): ForexDailyState {
  const key = madridDateKey(now);
  if (memory?.dateKey === key) return memory;
  const disk = readDisk();
  if (disk?.dateKey === key) {
    memory = disk;
    return disk;
  }
  memory = emptyState(key);
  writeDisk(memory);
  return memory;
}

export function saveForexDailyState(state: ForexDailyState): void {
  memory = { ...state, updatedAt: new Date().toISOString() };
  writeDisk(memory);
}

export type ForexGoalProgress = {
  scalp: { current: number; target: number; pct: number; trades: number; maxTrades: number };
  intraday: { current: number; target: number; pct: number; trades: number; maxTrades: number };
  dailyStopPips: number;
  stoppedOut: boolean;
  realizedPips: number;
  telegramConfirmRemaining: number;
};

export function getForexGoalProgress(now = new Date()): ForexGoalProgress {
  const s = getForexDailyState(now);
  const g = FOREX_DAILY_GOALS;
  return {
    scalp: {
      current: s.scalpPips,
      target: g.scalpingTargetPips,
      pct: Math.min(100, Math.max(0, (s.scalpPips / g.scalpingTargetPips) * 100)),
      trades: s.scalpTrades,
      maxTrades: g.maxScalpTrades,
    },
    intraday: {
      current: s.intradayPips,
      target: g.intradayTargetPips,
      pct: Math.min(100, Math.max(0, (s.intradayPips / g.intradayTargetPips) * 100)),
      trades: s.intradayTrades,
      maxTrades: g.maxIntradayTrades,
    },
    dailyStopPips: g.dailyStopPips,
    stoppedOut: s.stoppedOut || s.realizedPips <= g.dailyStopPips,
    realizedPips: s.realizedPips,
    telegramConfirmRemaining: s.telegramConfirmRemaining,
  };
}

export function canOpenForexTrade(style: ForexStrategyStyle): { ok: boolean; reason?: string } {
  const s = getForexDailyState();
  const g = FOREX_DAILY_GOALS;
  if (s.stoppedOut || s.realizedPips <= g.dailyStopPips) {
    return { ok: false, reason: "Stop diario de pips alcanzado" };
  }
  if (style === "SCALPING") {
    if (s.scalpTrades >= g.maxScalpTrades) return { ok: false, reason: "Máx 10 ops scalping/día" };
    if (s.scalpPips >= g.scalpingTargetPips) return { ok: false, reason: "Objetivo scalping +20p alcanzado" };
  } else {
    if (s.intradayTrades >= g.maxIntradayTrades) return { ok: false, reason: "Máx 5 ops intradía/día" };
    if (s.intradayPips >= g.intradayTargetPips) return { ok: false, reason: "Objetivo intradía +50p alcanzado" };
  }
  return { ok: true };
}

export function recordForexTradeEvent(params: {
  style: ForexStrategyStyle;
  pipsDelta: number;
  opened?: boolean;
}): ForexDailyState {
  const s = { ...getForexDailyState() };
  if (params.opened) {
    if (params.style === "SCALPING") s.scalpTrades += 1;
    else s.intradayTrades += 1;
  }
  s.realizedPips += params.pipsDelta;
  if (params.style === "SCALPING") s.scalpPips += params.pipsDelta;
  else s.intradayPips += params.pipsDelta;
  if (s.scalpPips >= FOREX_DAILY_GOALS.scalpingTargetPips) s.goalScalpHit = true;
  if (s.intradayPips >= FOREX_DAILY_GOALS.intradayTargetPips) s.goalIntradayHit = true;
  if (s.realizedPips <= FOREX_DAILY_GOALS.dailyStopPips) s.stoppedOut = true;
  saveForexDailyState(s);
  return s;
}

export function consumeTelegramConfirmSlot(): boolean {
  const s = { ...getForexDailyState() };
  if (s.telegramConfirmRemaining <= 0) return false;
  s.telegramConfirmRemaining -= 1;
  saveForexDailyState(s);
  return true;
}
