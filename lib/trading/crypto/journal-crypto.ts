/**
 * Crypto trade journal — .forgeos/journal/crypto-trades.jsonl
 * Path rooted at FORGEOS_ROOT (PM2) so writes never land in a random cwd.
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import type { CryptoStrategyId } from "@/lib/trading/crypto/strategies/types";
import type { MarketRegime } from "@/lib/trading/crypto/regime";
import {
  getStrategyMode,
  loadStrategyStatus,
} from "@/lib/trading/crypto/strategy-status";

function forgeosRoot(): string {
  return process.env.FORGEOS_ROOT?.trim() || process.cwd();
}

function DIR(): string {
  return path.join(forgeosRoot(), ".forgeos", "journal");
}

function FILE(): string {
  return path.join(DIR(), "crypto-trades.jsonl");
}

export type CryptoJournalTrade = {
  at: string;
  strategy: CryptoStrategyId | string;
  pair: string;
  regime: MarketRegime | string;
  side: "BUY" | "SELL";
  entry: number;
  exit: number | null;
  exitReason: string | null;
  grossPnlEur: number | null;
  feesEur: number;
  netPnlEur: number | null;
  /** Net P&L as % of notional (for promote rules). */
  netPct?: number | null;
  durationMs: number | null;
  mfePct: number | null;
  maePct: number | null;
  shadow: boolean;
  open?: boolean;
  rMultiple?: number | null;
  /** strategy|pair|candle — one journal line per signal. */
  signalKey?: string;
  stopLoss?: number | null;
  takeProfit?: number | null;
  qty?: number | null;
  orderId?: string | null;
};

export type StrategyPerf = {
  strategy: string;
  trades: number;
  wins: number;
  winRate: number;
  avgR: number | null;
  profitFactor: number | null;
  netPnlEur: number;
  maxDrawdownEur: number;
  shadowTrades: number;
  shadowNetPnlEur: number;
  shadowWins: number;
  shadowWinRate: number;
  live: boolean;
  mode: "live" | "shadow";
};

function ensure(): void {
  fs.mkdirSync(DIR(), { recursive: true });
}

export function cryptoJournalPath(): string {
  return FILE();
}

export function appendCryptoJournal(trade: CryptoJournalTrade): void {
  try {
    ensure();
    // Dedupe: same signalKey BUY open must not repeat
    if (trade.signalKey && trade.side === "BUY") {
      if (hasSignalKey(trade.signalKey)) {
        console.log(
          `[CryptoJournal] skip duplicate signalKey=${trade.signalKey}`,
        );
        return;
      }
    }
    fs.appendFileSync(FILE(), `${JSON.stringify(trade)}\n`, "utf8");
  } catch (err) {
    console.error(
      "[CryptoJournal] WRITE FAILED",
      FILE(),
      err instanceof Error ? err.message : err,
    );
  }
}

export function hasSignalKey(signalKey: string): boolean {
  for (const t of readCryptoJournal(20_000)) {
    if (t.signalKey === signalKey) return true;
  }
  return false;
}

export function readCryptoJournal(limit = 8000): CryptoJournalTrade[] {
  try {
    const f = FILE();
    if (!fs.existsSync(f)) return [];
    const lines = fs.readFileSync(f, "utf8").split("\n").filter(Boolean);
    return lines.slice(-limit).map((l) => JSON.parse(l) as CryptoJournalTrade);
  } catch (err) {
    console.warn(
      "[CryptoJournal] read failed:",
      err instanceof Error ? err.message : err,
    );
    return [];
  }
}

/** Open BUY rows (live and/or shadow) not yet closed. */
export function listOpenCryptoJournal(opts?: {
  shadow?: boolean | "any";
  pair?: string;
  strategy?: string;
}): CryptoJournalTrade[] {
  const shadowMode = opts?.shadow ?? "any";
  const opens = new Map<string, CryptoJournalTrade>();
  for (const t of readCryptoJournal(20_000)) {
    if (opts?.pair && t.pair.toUpperCase() !== opts.pair.toUpperCase()) continue;
    if (opts?.strategy && t.strategy !== opts.strategy) continue;
    if (shadowMode === true && !t.shadow) continue;
    if (shadowMode === false && t.shadow) continue;
    const key = `${t.shadow ? "S" : "L"}|${t.strategy}|${t.pair}|${t.signalKey ?? t.at}`;
    if (t.side === "BUY" && (t.open || t.exit == null)) {
      opens.set(key, t);
    }
    if (t.side === "SELL") {
      // close matching open
      for (const [k, o] of opens) {
        if (
          o.pair === t.pair &&
          o.strategy === t.strategy &&
          o.shadow === t.shadow
        ) {
          opens.delete(k);
        }
      }
    }
  }
  return [...opens.values()];
}

export function isCryptoStrategyLiveDisabled(strategy: string): boolean {
  return getStrategyMode(strategy) === "shadow";
}

export function computeCryptoStrategyPerf(
  trades: readonly CryptoJournalTrade[] = readCryptoJournal(),
): StrategyPerf[] {
  const map = new Map<
    string,
    StrategyPerf & {
      grossWin: number;
      grossLoss: number;
      equity: number;
      peak: number;
      shadowGrossWin: number;
    }
  >();
  for (const t of trades) {
    if (t.side !== "SELL" || t.netPnlEur == null) continue;
    let row = map.get(t.strategy);
    if (!row) {
      row = {
        strategy: t.strategy,
        trades: 0,
        wins: 0,
        winRate: 0,
        avgR: null,
        profitFactor: null,
        netPnlEur: 0,
        maxDrawdownEur: 0,
        shadowTrades: 0,
        shadowNetPnlEur: 0,
        shadowWins: 0,
        shadowWinRate: 0,
        live: getStrategyMode(t.strategy) === "live",
        mode: getStrategyMode(t.strategy),
        grossWin: 0,
        grossLoss: 0,
        equity: 0,
        peak: 0,
        shadowGrossWin: 0,
      };
      map.set(t.strategy, row);
    }
    if (t.shadow) {
      row.shadowTrades += 1;
      row.shadowNetPnlEur += t.netPnlEur;
      if (t.netPnlEur > 0) row.shadowWins += 1;
      continue;
    }
    row.trades += 1;
    row.netPnlEur += t.netPnlEur;
    if (t.netPnlEur > 0) {
      row.wins += 1;
      row.grossWin += t.netPnlEur;
    } else {
      row.grossLoss += Math.abs(t.netPnlEur);
    }
    if (t.rMultiple != null) {
      row.avgR =
        row.avgR == null
          ? t.rMultiple
          : (row.avgR * (row.trades - 1) + t.rMultiple) / row.trades;
    }
    row.equity += t.netPnlEur;
    row.peak = Math.max(row.peak, row.equity);
    row.maxDrawdownEur = Math.max(row.maxDrawdownEur, row.peak - row.equity);
  }
  const out: StrategyPerf[] = [];
  for (const row of map.values()) {
    row.winRate = row.trades > 0 ? row.wins / row.trades : 0;
    row.shadowWinRate =
      row.shadowTrades > 0 ? row.shadowWins / row.shadowTrades : 0;
    row.profitFactor =
      row.grossLoss > 0
        ? row.grossWin / row.grossLoss
        : row.grossWin > 0
          ? Infinity
          : null;
    row.mode = getStrategyMode(row.strategy);
    row.live = row.mode === "live";
    const {
      grossWin: _g,
      grossLoss: _l,
      equity: _e,
      peak: _p,
      shadowGrossWin: _sg,
      ...rest
    } = row;
    void _g;
    void _l;
    void _e;
    void _p;
    void _sg;
    out.push(rest);
  }
  // Include strategies with status but no trades yet
  const status = loadStrategyStatus();
  for (const id of Object.keys(status.strategies)) {
    if (out.some((o) => o.strategy === id)) continue;
    out.push({
      strategy: id,
      trades: 0,
      wins: 0,
      winRate: 0,
      avgR: null,
      profitFactor: null,
      netPnlEur: 0,
      maxDrawdownEur: 0,
      shadowTrades: 0,
      shadowNetPnlEur: 0,
      shadowWins: 0,
      shadowWinRate: 0,
      live: status.strategies[id]!.mode === "live",
      mode: status.strategies[id]!.mode,
    });
  }
  return out.sort((a, b) => b.netPnlEur - a.netPnlEur);
}

/** Reliability score for ranking (1 = neutral). */
export function strategyReliabilityMap(): Partial<Record<string, number>> {
  const perfs = computeCryptoStrategyPerf();
  const map: Record<string, number> = {};
  for (const p of perfs) {
    if (p.trades < 5) {
      map[p.strategy] = 1;
      continue;
    }
    const pf =
      p.profitFactor == null || !Number.isFinite(p.profitFactor)
        ? 1
        : p.profitFactor;
    map[p.strategy] = Math.max(0.2, Math.min(2, pf));
    if (p.mode === "shadow") map[p.strategy] = Math.min(map[p.strategy]!, 0.8);
  }
  return map;
}

/** @deprecated use autoDegradePromoteStrategies from strategy-status */
export function autoTuneCryptoStrategies(): string[] {
  return [];
}

export function journalOpenCryptoPairs(): Set<string> {
  const open = new Set<string>();
  for (const t of listOpenCryptoJournal({ shadow: false })) {
    open.add(t.pair.toUpperCase());
  }
  return open;
}

export function countOpenByStrategy(strategy: string): number {
  return listOpenCryptoJournal({ shadow: false, strategy }).length;
}

export function countOpenGridLevels(pair: string): number {
  return listOpenCryptoJournal({
    shadow: false,
    pair,
    strategy: "RANGE_GRID_15M",
  }).length;
}

/** Close a shadow (or live) open BUY with exit metrics. */
export function closeCryptoJournalOpen(params: {
  open: CryptoJournalTrade;
  exit: number;
  exitReason: string;
  feesEur?: number;
  mfePct?: number | null;
  maePct?: number | null;
}): void {
  const o = params.open;
  const qty = o.qty && o.qty > 0 ? o.qty : 1;
  const gross = (params.exit - o.entry) * qty;
  const fees = params.feesEur ?? 0;
  const net = gross - fees;
  const notional = o.entry * qty;
  const openedAt = Date.parse(o.at);
  appendCryptoJournal({
    at: new Date().toISOString(),
    strategy: o.strategy,
    pair: o.pair,
    regime: o.regime,
    side: "SELL",
    entry: o.entry,
    exit: params.exit,
    exitReason: params.exitReason,
    grossPnlEur: gross,
    feesEur: fees,
    netPnlEur: net,
    netPct: notional > 0 ? (net / notional) * 100 : null,
    durationMs: Number.isFinite(openedAt) ? Date.now() - openedAt : null,
    mfePct: params.mfePct ?? null,
    maePct: params.maePct ?? null,
    shadow: o.shadow,
    signalKey: o.signalKey,
    rMultiple:
      o.stopLoss != null && o.entry > o.stopLoss
        ? (params.exit - o.entry) / (o.entry - o.stopLoss)
        : null,
  });
}
