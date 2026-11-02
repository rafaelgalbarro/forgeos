/**
 * Kraken Futures: validated rules from the owner's 40-list (backtest scripts/crypto-forum40.ts).
 * Only rows that are liveEligible AND locked in .forgeos/crypto-forum40-latest.json trade.
 * Strategy id in the journal: C40_<RULE>_<TF> (e.g. C40_F04_KUMO_H4). Same exits as the backtest:
 * stop 2 × ATR, take-profit rr × stop (6 × ATR when the rule has none), rule exit on a closed bar,
 * time exit (H1 72 h, H4 5 days).
 */

import "server-only";

import fs from "node:fs";
import path from "node:path";
import { getBars, type Bar } from "@/lib/brokers/kraken/market-store";
import { spotPairToPfSymbol } from "@/lib/brokers/kraken-futures/instruments";
import { parseChartsCandles } from "@/lib/brokers/kraken-futures/charts";
import { f40Rule, f40RuleExitOnLast, f40SignalOnLast, type F40Result } from "@/lib/forex-bot/forum40";
import type { FxCandle } from "@/lib/forex-bot/types";
import type { CryptoStrategyId, CryptoStrategySignal } from "./types";

type Locked = { rule: string; pf: string; tf: "H1" | "H4" };

let lockedCache: { at: number; rows: Locked[] } | null = null;
function lockedRows(): Locked[] {
  if (lockedCache && Date.now() - lockedCache.at < 5 * 60_000) return lockedCache.rows;
  let rows: Locked[] = [];
  try {
    const p = path.join(process.env.FORGEOS_ROOT || process.cwd(), ".forgeos", "crypto-forum40-latest.json");
    const j = JSON.parse(fs.readFileSync(p, "utf8")) as { results: F40Result[] };
    rows = (j.results ?? [])
      .filter((r) => r.liveEligible && r.locked && (r.tf === "H1" || r.tf === "H4"))
      .map((r) => ({ rule: r.rule, pf: r.instrument.toUpperCase(), tf: r.tf as "H1" | "H4" }));
  } catch {
    rows = [];
  }
  lockedCache = { at: Date.now(), rows };
  return rows;
}

export function c40StrategyId(rule: string, tf: string): string {
  return `C40_${rule}_${tf}`;
}

export function isC40Strategy(id: string): boolean {
  return /^C40_/i.test(id.trim());
}

export function c40MaxHoldMs(id: string): number | null {
  if (!isC40Strategy(id)) return null;
  return /_H4$/i.test(id) ? 120 * 3600_000 : 72 * 3600_000;
}

const h4Cache = new Map<string, { at: number; bars: FxCandle[] }>();

/** Fetch 4h candles (Kraken Futures charts) for contracts with a locked H4 rule. Call once per cycle. */
export async function prefetchC40Bars(): Promise<void> {
  const pfs = [...new Set(lockedRows().filter((r) => r.tf === "H4").map((r) => r.pf))];
  for (const pf of pfs) {
    const hit = h4Cache.get(pf);
    if (hit && Date.now() - hit.at < 20 * 60_000) continue;
    try {
      const from = Math.floor(Date.now() / 1000) - 300 * 14400;
      const res = await fetch(`https://futures.kraken.com/api/charts/v1/trade/${pf}/4h?from=${from}`, { cache: "no-store", signal: AbortSignal.timeout(15_000) });
      const rows = parseChartsCandles(await res.json());
      const bars = rows.map((r) => ({ time: Math.floor(Date.parse(r.time) / 1000), open: r.open, high: r.high, low: r.low, close: r.close, volume: r.volume }));
      if (bars.length) h4Cache.set(pf, { at: Date.now(), bars });
    } catch {
      /* keep the previous bars */
    }
  }
}

function closedFx(bars: readonly Bar[] | readonly FxCandle[], tfSec: number): FxCandle[] {
  const now = Math.floor(Date.now() / 1000);
  const b = bars.map((x) => ({ time: x.time, open: x.open, high: x.high, low: x.low, close: x.close, volume: x.volume }));
  const last = b[b.length - 1];
  return last && last.time + tfSec > now ? b.slice(0, -1) : b;
}

function barsFor(pair: string, pf: string, tf: "H1" | "H4"): FxCandle[] {
  return tf === "H1" ? closedFx(getBars(pair, "60"), 3600) : closedFx(h4Cache.get(pf)?.bars ?? [], 14400);
}

export function evaluateCryptoF40(pair: string): CryptoStrategySignal[] {
  const pf = spotPairToPfSymbol(pair)?.toUpperCase();
  if (!pf) return [];
  const out: CryptoStrategySignal[] = [];
  for (const row of lockedRows().filter((r) => r.pf === pf)) {
    const bars = barsFor(pair, pf, row.tf);
    const sig = f40SignalOnLast(row.rule, bars);
    if (!sig) continue;
    const last = bars[bars.length - 1]!;
    const entry = last.close;
    const dir = sig.side === "long" ? 1 : -1;
    const rr = f40Rule(row.rule)?.rr;
    const stop = entry - dir * 2 * sig.atr;
    const tp = entry + dir * (rr ? rr * 2 : 6) * sig.atr;
    const id = c40StrategyId(row.rule, row.tf);
    out.push({
      strategyId: id as CryptoStrategyId,
      direction: sig.side === "long" ? "BUY" : "SELL",
      confidence: 0.6,
      reasoning: `${f40Rule(row.rule)?.name ?? row.rule} (${row.tf})`,
      entry,
      stopLoss: stop,
      takeProfit: tp,
      expectedMovePct: Math.abs(tp - entry) / entry,
      maxHoldMs: c40MaxHoldMs(id) ?? 72 * 3600_000,
      atr: sig.atr,
      stopLossPct: Math.abs(entry - stop) / entry,
      riskR: 1,
      candleTime: last.time,
    } as CryptoStrategySignal);
  }
  return out;
}

/** Rule exit for an open C40 leg (evaluated on the last closed bar). */
export function c40RuleExit(strategyId: string, pair: string, side: "long" | "short"): boolean {
  const m = /^C40_(.+)_(H1|H4)$/i.exec(strategyId.trim());
  if (!m) return false;
  const pf = spotPairToPfSymbol(pair)?.toUpperCase();
  if (!pf) return false;
  try {
    return f40RuleExitOnLast(m[1]!.toUpperCase(), barsFor(pair, pf, m[2]!.toUpperCase() as "H1" | "H4"), side);
  } catch {
    return false;
  }
}
