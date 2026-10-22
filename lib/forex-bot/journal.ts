/** Forex bot journal + small state file under .forgeos/forex-bot (server). */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { FxTrade } from "./types";

export function fxBotDir(): string {
  const root = process.env.FORGEOS_ROOT || process.cwd();
  const dir = path.join(root, ".forgeos", "forex-bot");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

const TRADES_FILE = () => path.join(fxBotDir(), "trades.json");
const STATE_FILE = () => path.join(fxBotDir(), "state.json");

export function loadFxTrades(): FxTrade[] {
  try {
    return JSON.parse(fs.readFileSync(TRADES_FILE(), "utf8")) as FxTrade[];
  } catch {
    return [];
  }
}

export function saveFxTrades(trades: FxTrade[]): void {
  // Keep open trades + the last 1000 closed ones.
  const open = trades.filter((t) => !t.closedAt);
  const closed = trades.filter((t) => t.closedAt).slice(-1000);
  fs.writeFileSync(TRADES_FILE(), JSON.stringify([...closed, ...open], null, 2), "utf8");
}

export type FxBotState = {
  updatedAt: string;
  lastCycleAt: string | null;
  lastCandleByPair: Record<string, number>;
  haltedDay: string | null;
  lastSummary: string;
  dataSource: string;
};

export function loadFxState(): FxBotState {
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE(), "utf8")) as FxBotState;
  } catch {
    return { updatedAt: "", lastCycleAt: null, lastCandleByPair: {}, haltedDay: null, lastSummary: "", dataSource: "" };
  }
}

export function saveFxState(s: FxBotState): void {
  s.updatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE(), JSON.stringify(s, null, 2), "utf8");
}

/** Strategies that passed the backtest gate (scripts/forex-backtest.ts). */
export function fxEligibleStrategies(): Set<string> {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(fxBotDir(), "backtest-latest.json"), "utf8")) as {
      rows?: Array<{ strategy: string; liveEligible: boolean }>;
    };
    return new Set((raw.rows ?? []).filter((r) => r.liveEligible).map((r) => r.strategy));
  } catch {
    return new Set();
  }
}
