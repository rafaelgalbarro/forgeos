/**
 * Kraken inactivity diagnostics — near-misses, regime hours, discard reasons.
 * Persisted under .forgeos/cache/crypto-diagnostics.json
 */

import fs from "node:fs";
import path from "node:path";
import {
  ALL_CRYPTO_STRATEGY_IDS,
  type CryptoStrategyId,
} from "@/lib/trading/crypto/strategies/types";
import type { MarketRegime } from "@/lib/trading/crypto/regime";

function forgeosRoot(): string {
  return process.env.FORGEOS_ROOT?.trim() || process.cwd();
}

function filePath(): string {
  return path.join(forgeosRoot(), ".forgeos", "cache", "crypto-diagnostics.json");
}

export type NearMissRow = {
  strategy: string;
  pair: string;
  missing: string;
  passed: string[];
  at: string;
};

export type StrategyDiag = {
  attempts: number;
  buys: number;
  nearMisses: number;
  discardReasons: Record<string, number>;
};

export type DiagnosticsState = {
  updatedAt: string;
  /** Rolling 24h buckets of regime minutes */
  regimeMinutes: Record<MarketRegime, number>;
  regimeLastAt: string | null;
  regimeLast: MarketRegime | null;
  strategies: Record<string, StrategyDiag>;
  nearMisses: NearMissRow[];
  universePairs: string[];
  lastCycleAt: string | null;
  lastCycleSignals: number;
  tradesLast24h: number;
};

function emptyStrategy(): StrategyDiag {
  return { attempts: 0, buys: 0, nearMisses: 0, discardReasons: {} };
}

function emptyState(): DiagnosticsState {
  const strategies: Record<string, StrategyDiag> = {};
  for (const id of ALL_CRYPTO_STRATEGY_IDS) strategies[id] = emptyStrategy();
  return {
    updatedAt: new Date().toISOString(),
    regimeMinutes: { ALCISTA: 0, LATERAL: 0, BAJISTA: 0 },
    regimeLastAt: null,
    regimeLast: null,
    strategies,
    nearMisses: [],
    universePairs: [],
    lastCycleAt: null,
    lastCycleSignals: 0,
    tradesLast24h: 0,
  };
}

let memory: DiagnosticsState | null = null;

export function loadDiagnostics(): DiagnosticsState {
  if (memory) return memory;
  try {
    const p = filePath();
    if (!fs.existsSync(p)) {
      memory = emptyState();
      return memory;
    }
    const raw = JSON.parse(fs.readFileSync(p, "utf8")) as DiagnosticsState;
    memory = { ...emptyState(), ...raw, strategies: { ...emptyState().strategies, ...raw.strategies } };
    return memory;
  } catch {
    memory = emptyState();
    return memory;
  }
}

export function saveDiagnostics(state: DiagnosticsState = loadDiagnostics()): void {
  try {
    state.updatedAt = new Date().toISOString();
    fs.mkdirSync(path.dirname(filePath()), { recursive: true });
    fs.writeFileSync(filePath(), JSON.stringify(state, null, 2), "utf8");
    memory = state;
  } catch (err) {
    console.warn(
      "[CryptoDiag] save failed:",
      err instanceof Error ? err.message : err,
    );
  }
}

/** Accumulate regime time since last tick. */
export function recordRegimeTick(regime: MarketRegime): void {
  const s = loadDiagnostics();
  const now = Date.now();
  if (s.regimeLastAt && s.regimeLast) {
    const elapsedMin = Math.min(30, (now - Date.parse(s.regimeLastAt)) / 60_000);
    if (elapsedMin > 0) {
      s.regimeMinutes[s.regimeLast] =
        (s.regimeMinutes[s.regimeLast] ?? 0) + elapsedMin;
    }
  }
  // Decay older than ~24h roughly by capping total
  const total =
    s.regimeMinutes.ALCISTA + s.regimeMinutes.LATERAL + s.regimeMinutes.BAJISTA;
  if (total > 24 * 60) {
    const scale = (24 * 60) / total;
    s.regimeMinutes.ALCISTA *= scale;
    s.regimeMinutes.LATERAL *= scale;
    s.regimeMinutes.BAJISTA *= scale;
  }
  s.regimeLast = regime;
  s.regimeLastAt = new Date(now).toISOString();
  saveDiagnostics(s);
}

export function recordStrategyEval(params: {
  strategy: CryptoStrategyId | string;
  pair: string;
  direction: string;
  reasoning: string;
  /** Conditions that passed (for near-miss detection). */
  passed?: string[];
  /** Single failed condition if near-miss. */
  missing?: string | null;
}): void {
  const s = loadDiagnostics();
  const id = params.strategy;
  if (!s.strategies[id]) s.strategies[id] = emptyStrategy();
  const row = s.strategies[id]!;
  row.attempts += 1;
  if (params.direction === "BUY") {
    row.buys += 1;
  } else {
    const reason = params.reasoning.slice(0, 100) || "hold";
    row.discardReasons[reason] = (row.discardReasons[reason] ?? 0) + 1;
    if (params.missing) {
      row.nearMisses += 1;
      s.nearMisses.push({
        strategy: id,
        pair: params.pair,
        missing: params.missing,
        passed: params.passed ?? [],
        at: new Date().toISOString(),
      });
      if (s.nearMisses.length > 200) s.nearMisses = s.nearMisses.slice(-200);
    }
  }
  saveDiagnostics(s);
}

export function recordCycleMeta(params: {
  universePairs: string[];
  signals: number;
  tradesLast24h: number;
}): void {
  const s = loadDiagnostics();
  s.universePairs = params.universePairs;
  s.lastCycleSignals = params.signals;
  s.lastCycleAt = new Date().toISOString();
  s.tradesLast24h = params.tradesLast24h;
  saveDiagnostics(s);
}

export function topDiscardReasons(limit = 8): Array<{ reason: string; count: number }> {
  const s = loadDiagnostics();
  const agg: Record<string, number> = {};
  for (const row of Object.values(s.strategies)) {
    for (const [r, n] of Object.entries(row.discardReasons)) {
      agg[r] = (agg[r] ?? 0) + n;
    }
  }
  return Object.entries(agg)
    .map(([reason, count]) => ({ reason, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

export function formatDiagnosticsTelegram(): string {
  const s = loadDiagnostics();
  const totalMin =
    s.regimeMinutes.ALCISTA + s.regimeMinutes.LATERAL + s.regimeMinutes.BAJISTA;
  const pct = (m: number) =>
    totalMin > 0 ? `${((m / totalMin) * 100).toFixed(0)}%` : "0%";
  const lines = [
    "🔍 <b>Kraken diagnóstico (0 ops 24h)</b>",
    `Universo: ${s.universePairs.length} pares`,
    `Régimen actual: ${s.regimeLast ?? "—"} @ ${s.regimeLastAt ?? "—"}`,
    `Régimen 24h: ALCISTA ${pct(s.regimeMinutes.ALCISTA)} | LATERAL ${pct(s.regimeMinutes.LATERAL)} | BAJISTA ${pct(s.regimeMinutes.BAJISTA)}`,
    `Último ciclo: signals=${s.lastCycleSignals} @ ${s.lastCycleAt ?? "—"}`,
  ];
  for (const id of ALL_CRYPTO_STRATEGY_IDS) {
    const r = s.strategies[id];
    if (!r) continue;
    lines.push(
      `${id}: att=${r.attempts} buy=${r.buys} near=${r.nearMisses}`,
    );
  }
  const top = topDiscardReasons(5);
  if (top.length) {
    lines.push("Top descartes:");
    for (const t of top) lines.push(`· ${t.count}× ${t.reason.slice(0, 60)}`);
  }
  return lines.join("\n");
}

/** Strategies allowed per regime (documentation + API). */
export const REGIME_STRATEGY_MATRIX: Record<MarketRegime, string[]> = {
  ALCISTA: [...ALL_CRYPTO_STRATEGY_IDS],
  LATERAL: [
    "RSI_MEAN_REVERSION_15M",
    "RANGE_GRID_15M",
    "VWAP_RECLAIM_15M",
    "LIQUIDITY_SWEEP_15M",
    "EMA_CROSS_15M",
    "SESSION_OPEN_BREAKOUT",
    "MICRO_BREAKOUT_1M",
    "MOMENTUM_IGNITION_1M",
    "CAPITULATION_REVERSAL_1M",
    "VWAP_BOUNCE_5M",
  ],
  BAJISTA: [], // solo salidas
};
