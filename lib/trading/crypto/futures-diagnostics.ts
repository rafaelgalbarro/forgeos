/**
 * Kraken Futures engine diagnostics — separate from spot crypto-diagnostics.json.
 */

import fs from "node:fs";
import path from "node:path";

import { forgeosCacheFile } from "@/lib/trading/crypto/forgeos-cache";
import {
  ALL_CRYPTO_STRATEGY_IDS,
  FUTURES_SHORT_STRATEGY_IDS,
} from "@/lib/trading/crypto/strategies/types";

export const FUTURES_DIAGNOSTICS_FILE = forgeosCacheFile(
  "kraken-futures-diagnostics.json",
);

export type FuturesDirectionDiag = {
  attempts: number;
  signals: number;
  nearMisses: number;
  discardReasons: Record<string, number>;
};

export type FuturesStrategyDirectionDiag = {
  long: FuturesDirectionDiag;
  short: FuturesDirectionDiag;
};

export type FuturesNearMissRow = {
  strategy: string;
  direction: "long" | "short";
  pair: string;
  missing: string;
  at: string;
};

export type FuturesDiagnosticsState = {
  updatedAt: string;
  lastCycleAt: string | null;
  lastCycleSignals: number;
  strategies: Record<string, FuturesStrategyDirectionDiag>;
  nearMisses: FuturesNearMissRow[];
};

function emptyDir(): FuturesDirectionDiag {
  return { attempts: 0, signals: 0, nearMisses: 0, discardReasons: {} };
}

function emptyStrategyRow(): FuturesStrategyDirectionDiag {
  return { long: emptyDir(), short: emptyDir() };
}

function baseStrategyIds(): string[] {
  return [...ALL_CRYPTO_STRATEGY_IDS, ...FUTURES_SHORT_STRATEGY_IDS];
}

function emptyState(): FuturesDiagnosticsState {
  const strategies: Record<string, FuturesStrategyDirectionDiag> = {};
  for (const id of baseStrategyIds()) strategies[id] = emptyStrategyRow();
  return {
    updatedAt: new Date().toISOString(),
    lastCycleAt: null,
    lastCycleSignals: 0,
    strategies,
    nearMisses: [],
  };
}

let memory: FuturesDiagnosticsState | null = null;

export function loadFuturesDiagnostics(): FuturesDiagnosticsState {
  if (memory) return memory;
  try {
    if (!fs.existsSync(FUTURES_DIAGNOSTICS_FILE)) {
      memory = emptyState();
      return memory;
    }
    const raw = JSON.parse(
      fs.readFileSync(FUTURES_DIAGNOSTICS_FILE, "utf8"),
    ) as FuturesDiagnosticsState;
    const base = emptyState();
    memory = {
      ...base,
      ...raw,
      strategies: { ...base.strategies, ...raw.strategies },
    };
    return memory;
  } catch {
    memory = emptyState();
    return memory;
  }
}

export function saveFuturesDiagnostics(
  state: FuturesDiagnosticsState = loadFuturesDiagnostics(),
): void {
  try {
    state.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(FUTURES_DIAGNOSTICS_FILE), { recursive: true });
    fs.writeFileSync(FUTURES_DIAGNOSTICS_FILE, JSON.stringify(state, null, 2), "utf8");
    memory = state;
  } catch (err) {
    console.warn(
      "[FuturesDiag] save failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

export function recordFuturesStrategyEval(params: {
  strategy: string;
  pair: string;
  direction: "long" | "short";
  /** BUY/SELL/HOLD from evaluator */
  signalDirection: string;
  reasoning: string;
  missing?: string | null;
}): void {
  const s = loadFuturesDiagnostics();
  if (!s.strategies[params.strategy]) s.strategies[params.strategy] = emptyStrategyRow();
  const row = s.strategies[params.strategy]![params.direction];
  row.attempts += 1;

  const isSignal =
    (params.direction === "long" && params.signalDirection === "BUY") ||
    (params.direction === "short" && params.signalDirection === "SELL");

  if (isSignal) {
    row.signals += 1;
  } else {
    const reason = params.missing ?? (params.reasoning.slice(0, 100) || "hold");
    row.discardReasons[reason] = (row.discardReasons[reason] ?? 0) + 1;
    if (params.missing) {
      row.nearMisses += 1;
      s.nearMisses.push({
        strategy: params.strategy,
        direction: params.direction,
        pair: params.pair,
        missing: params.missing,
        at: new Date().toISOString(),
      });
      if (s.nearMisses.length > 200) s.nearMisses = s.nearMisses.slice(-200);
    }
  }
  saveFuturesDiagnostics(s);
}

export function recordFuturesCycleMeta(params: {
  signals?: number;
}): void {
  const s = loadFuturesDiagnostics();
  s.lastCycleAt = new Date().toISOString();
  if (params.signals != null) s.lastCycleSignals = params.signals;
  saveFuturesDiagnostics(s);
}

export function futuresTopDiscardReasons(
  limit = 12,
): Array<{ strategy: string; direction: string; reason: string; count: number }> {
  const s = loadFuturesDiagnostics();
  const out: Array<{ strategy: string; direction: string; reason: string; count: number }> =
    [];
  for (const [strategy, dirs] of Object.entries(s.strategies)) {
    for (const direction of ["long", "short"] as const) {
      const row = dirs[direction];
      for (const [reason, count] of Object.entries(row.discardReasons)) {
        out.push({ strategy, direction, reason, count });
      }
    }
  }
  return out.sort((a, b) => b.count - a.count).slice(0, limit);
}
