/**
 * Nightly Kraken crypto backtester — reuses strategy evaluators + exit rules.
 *
 *   npx tsx --require ./scripts/stub-server-only.cjs scripts/crypto-backtest.ts
 *   npx tsx ... scripts/crypto-backtest.ts --apply   # only then may degrade (≥20 OOS trades)
 *
 * Manual runs never change strategy status unless --apply is passed.
 */

import fs from "node:fs";
import path from "node:path";
import {
  ALL_CRYPTO_STRATEGY_IDS,
  type CryptoStrategyId,
} from "../lib/trading/crypto/strategies/types";
import { evaluateTrendPullback1h } from "../lib/trading/crypto/strategies/trend-pullback-1h";
import { evaluateRsiMeanReversion15m } from "../lib/trading/crypto/strategies/rsi-mean-reversion-15m";
import { evaluateMomentumBreakout5m } from "../lib/trading/crypto/strategies/momentum-breakout-5m";
import { evaluateTopGainerPullback } from "../lib/trading/crypto/strategies/top-gainer-pullback";
import { evaluateVwapReclaim15m } from "../lib/trading/crypto/strategies/vwap-reclaim-15m";
import { evaluateRangeGrid15m } from "../lib/trading/crypto/strategies/range-grid-15m";
import {
  evaluateRsi2Trend5m,
  rsi2TrendShouldExit,
} from "../lib/trading/crypto/strategies/rsi2-trend-5m";
import { evaluateLiquiditySweep15m } from "../lib/trading/crypto/strategies/liquidity-sweep-15m";
import { evaluateBbSqueezeBreakout15m } from "../lib/trading/crypto/strategies/bb-squeeze-breakout-15m";
import { evaluateEmaCross15m } from "../lib/trading/crypto/strategies/ema-cross-15m";
import { evaluateSessionOpenBreakout } from "../lib/trading/crypto/strategies/session-open-breakout";
import { evaluateRsVsBtc1h, topRsPairsVsBtc } from "../lib/trading/crypto/strategies/rs-vs-btc-1h";
import { evaluateMicroBreakout1m } from "../lib/trading/crypto/strategies/micro-breakout-1m";
import {
  evaluateMomentumIgnition1m,
  topGainerPairs1h,
} from "../lib/trading/crypto/strategies/momentum-ignition-1m";
import { evaluateCapitulationReversal1m } from "../lib/trading/crypto/strategies/capitulation-reversal-1m";
import { evaluateVwapBounce5m } from "../lib/trading/crypto/strategies/vwap-bounce-5m";
import { applyBacktestDegradation } from "../lib/trading/crypto/strategy-status";
import type { Bar } from "../lib/brokers/kraken/market-store";
import {
  BT_MAKER,
  BT_TAKER,
  compoundMaxDrawdownPct,
  findLimitBuyFill,
  liquidityBucket,
  netPnlPctFromPrices,
  priorRange,
  roundTripCostFraction,
  simulateLongTrade,
} from "../lib/trading/crypto/backtest-core";

/** Fast: maker+maker+spread (post-only round trip). */
function fastRoundTripCost(spreadPct: number): number {
  return BT_MAKER + BT_MAKER + Math.max(0, spreadPct);
}

const ROOT = process.env.FORGEOS_ROOT?.trim() || path.resolve(__dirname, "..");
process.env.FORGEOS_ROOT = ROOT;
const CACHE = path.join(ROOT, ".forgeos", "cache", "kraken-ohlc");
const APPLY = process.argv.includes("--apply");

type Trade = {
  strategy: CryptoStrategyId;
  pair: string;
  entry: number;
  exit: number;
  netPct: number;
  win: boolean;
  mfePct: number;
  maePct: number;
  liquidity: string;
  sample: "in" | "out";
};

type SignalCount = Record<string, { attempts: number; buys: number; holds: string[] }>;

async function fetchOhlc(
  pair: string,
  interval: 1 | 5 | 15 | 60,
): Promise<Bar[]> {
  const cacheFile = path.join(CACHE, `${pair}_${interval}.json`);
  try {
    if (fs.existsSync(cacheFile)) {
      const age = Date.now() - fs.statSync(cacheFile).mtimeMs;
      if (age < 12 * 3600_000) {
        return JSON.parse(fs.readFileSync(cacheFile, "utf8")) as Bar[];
      }
    }
  } catch {
    /* fetch */
  }
  const url = `https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=${interval}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    error?: string[];
    result?: Record<string, unknown>;
  };
  if (json.error?.length) return [];
  const result = json.result ?? {};
  const key = Object.keys(result).find((k) => k !== "last");
  if (!key) return [];
  const rows = result[key] as Array<
    [number, string, string, string, string, string, string, string]
  >;
  const bars: Bar[] = rows.map((r) => ({
    time: Number(r[0]),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[6]),
  }));
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(bars), "utf8");
  return bars;
}

async function topPairs(): Promise<Array<{ pair: string; volEur: number }>> {
  const url = "https://api.kraken.com/0/public/Ticker";
  const res = await fetch(url);
  const json = (await res.json()) as {
    result?: Record<
      string,
      { v?: string[]; c?: string[]; a?: string[]; b?: string[] }
    >;
  };
  const out: Array<{ pair: string; volEur: number; spread: number }> = [];
  for (const [k, v] of Object.entries(json.result ?? {})) {
    if (!/EUR$/.test(k) && !/ZEUR$/.test(k)) continue;
    const pair = k
      .replace(/^X/, "")
      .replace(/ZEUR$/, "EUR")
      .replace(/XBT/, "XBT");
    const norm = pair.includes("EUR") ? pair : `${pair}EUR`;
    const vol = Number(v.v?.[1] ?? 0);
    const px = Number(v.c?.[0] ?? 0);
    const ask = Number(v.a?.[0] ?? 0);
    const bid = Number(v.b?.[0] ?? 0);
    const spread =
      ask > 0 && bid > 0 ? (ask - bid) / ((ask + bid) / 2) : 1;
    if (spread >= 0.005) continue;
    out.push({ pair: norm, volEur: vol * px, spread });
  }
  const preferred = [
    "XBTEUR",
    "ETHEUR",
    "SOLEUR",
    "ADAEUR",
    "DOTEUR",
    "AVAXEUR",
    "LINKEUR",
    "XDGEUR",
    "LTCEUR",
    "ATOMEUR",
  ];
  const mapped = out
    .map((o) => ({
      ...o,
      pair: o.pair.replace(/^XXBTZ/, "XBT").replace(/ZEUR$/, "EUR"),
    }))
    .filter((o) => o.volEur > 300_000);
  mapped.sort((a, b) => b.volEur - a.volEur);
  const picks = [
    ...preferred.filter((p) => mapped.some((m) => m.pair === p || m.pair.includes(p.slice(0, 3)))),
    ...mapped.map((m) => m.pair),
  ];
  const uniq = [...new Set(picks)].slice(0, 60);
  return uniq.map((pair) => ({
    pair,
    volEur: mapped.find((m) => m.pair === pair)?.volEur ?? 1_000_000,
  }));
}

function sliceBars(bars: Bar[], endIdx: number, n: number): Bar[] {
  return bars.slice(Math.max(0, endIdx - n + 1), endIdx + 1);
}

/** Align 1h/5m windows to the same unix time as bars15[i]. */
function windowEndingAt(
  bars: Bar[],
  targetTime: number,
  n: number,
): Bar[] {
  if (!bars.length) return [];
  let end = bars.length - 1;
  while (end > 0 && bars[end]!.time > targetTime) end -= 1;
  return bars.slice(Math.max(0, end - n + 1), end + 1);
}

function rescaleStopsToEntry(
  entry: number,
  signalEntry: number,
  stop: number,
  tp: number,
): { stop: number; tp: number } {
  if (!(signalEntry > 0) || !(entry > 0)) return { stop, tp };
  const stopPct = (signalEntry - stop) / signalEntry;
  const tpPct = (tp - signalEntry) / signalEntry;
  return {
    stop: entry * (1 - Math.max(0.002, Math.min(0.08, stopPct))),
    tp: entry * (1 + Math.max(0.004, Math.min(0.15, tpPct))),
  };
}

function simulatePair(
  pair: string,
  bars5: Bar[],
  bars15: Bar[],
  bars1h: Bar[],
  btc1h: Bar[],
  volEur: number,
  days: number,
  signalCounts: SignalCount,
  topRs: Set<string>,
): Trade[] {
  const trades: Trade[] = [];
  if (bars15.length < 150) return trades;
  const liq = liquidityBucket(volEur);
  const start = Math.max(120, bars15.length - days * 96);
  const inSampleEnd = start + Math.floor((bars15.length - start) * (20 / 30));

  for (let i = start; i < bars15.length - 3; i++) {
    const t15 = bars15[i]!.time;
    const w15 = sliceBars(bars15, i, 150);
    const w5 = windowEndingAt(bars5, t15, 80);
    const w1h = windowEndingAt(bars1h, t15, 220);
    const wBtc = windowEndingAt(btc1h, t15, 220);
    const sample: "in" | "out" = i < inSampleEnd ? "in" : "out";

    const raw = [
      evaluateTrendPullback1h(w1h),
      evaluateRsiMeanReversion15m(w15, w1h),
      evaluateMomentumBreakout5m(w5.length ? w5 : w15, w1h),
      evaluateTopGainerPullback(w15, w1h, null),
      evaluateVwapReclaim15m(w15),
      evaluateRangeGrid15m(w15, "LATERAL", 0, {
        signalBarIndex: w15.length - 1,
        excludeSignalBarFromRange: true,
      }),
      evaluateRsi2Trend5m(w5.length ? w5 : w15, w1h),
      evaluateLiquiditySweep15m(w15),
      evaluateBbSqueezeBreakout15m(w15),
      evaluateRsVsBtc1h(w15, w1h, wBtc, "ALCISTA", {
        isTop3Rs: topRs.has(pair),
      }),
      evaluateEmaCross15m(w15, w1h),
      evaluateSessionOpenBreakout(w15, new Date(t15 * 1000)),
    ];

    for (const sig of raw) {
      const id = sig.strategyId;
      if (!signalCounts[id]) signalCounts[id] = { attempts: 0, buys: 0, holds: [] };
      signalCounts[id]!.attempts += 1;
      if (sig.direction !== "BUY") {
        const reason = sig.reasoning.slice(0, 80);
        const holds = signalCounts[id]!.holds;
        if (holds.length < 5 && !holds.includes(reason)) holds.push(reason);
        continue;
      }
      signalCounts[id]!.buys += 1;

      const cost = roundTripCostFraction(0.001);
      if (sig.expectedMovePct < cost * 3) {
        const holds = signalCounts[id]!.holds;
        const r = "cost_filter_3x";
        if (holds.length < 5 && !holds.includes(r)) holds.push(r);
        continue;
      }

      let entryBarIndex: number;
      let entryPrice: number;
      let stop: number;
      let tp: number;

      if (sig.strategyId === "RANGE_GRID_15M") {
        const range = priorRange(bars15, i, 96);
        if (!range) continue;
        const limit = range.lo + (range.hi - range.lo) / 3;
        const fill = findLimitBuyFill(bars15, i, limit, 16);
        if (!fill) continue;
        entryBarIndex = fill.entryBarIndex;
        entryPrice = fill.entryPrice;
        const a = Math.abs(sig.atr) || entryPrice * 0.01;
        stop = range.lo - a;
        tp = range.hi - (range.hi - range.lo) / 3;
      } else {
        // Market: signal on close of i → enter next bar open
        entryBarIndex = i + 1;
        entryPrice = bars15[entryBarIndex]!.open;
        const scaled = rescaleStopsToEntry(
          entryPrice,
          sig.entry > 0 ? sig.entry : bars15[i]!.close,
          sig.stopLoss,
          sig.takeProfit,
        );
        stop = scaled.stop;
        tp = scaled.tp;
      }

      const maxBars = Math.max(4, Math.floor(sig.maxHoldMs / (15 * 60_000)));
      let fill = simulateLongTrade({
        bars: bars15,
        entryBarIndex,
        entryPrice,
        stopLoss: stop,
        takeProfit: tp,
        maxBars,
      });
      if (!fill) continue;

      // RSI2 early exit overlay
      if (sig.strategyId === "RSI2_TREND_5M") {
        for (
          let j = entryBarIndex + 1;
          j <= Math.min(bars15.length - 1, entryBarIndex + maxBars);
          j++
        ) {
          const reason = rsi2TrendShouldExit(
            windowEndingAt(bars5.length ? bars5 : bars15, bars15[j]!.time, 40),
            entryPrice,
            bars15[entryBarIndex]!.time * 1000,
            bars15[j]!.time * 1000,
          );
          if (reason) {
            fill = {
              ...fill,
              exit: bars15[j]!.close,
              grossPct:
                ((bars15[j]!.close - entryPrice) / entryPrice) * 100,
              netPct: netPnlPctFromPrices(entryPrice, bars15[j]!.close),
              exitKind: "signal",
            };
            break;
          }
        }
      }

      trades.push({
        strategy: sig.strategyId,
        pair,
        entry: fill.entry,
        exit: fill.exit,
        netPct: fill.netPct,
        win: fill.netPct > 0,
        mfePct: fill.mfePct,
        maePct: fill.maePct,
        liquidity: liq,
        sample,
      });
      break; // one live trade per bar/pair
    }
  }
  return trades;
}

/** Fast 1m strategies — last `days` days of 1m OHLC (default 7). */
function simulateFastPair(
  pair: string,
  bars1: Bar[],
  bars5: Bar[],
  bars1h: Bar[],
  volEur: number,
  days: number,
  signalCounts: SignalCount,
  top5: Set<string>,
): Trade[] {
  const trades: Trade[] = [];
  if (bars1.length < 80) return trades;
  const liq = liquidityBucket(volEur);
  const start = Math.max(40, bars1.length - days * 24 * 60);
  const inSampleEnd = start + Math.floor((bars1.length - start) * (5 / 7));

  for (let i = start; i < bars1.length - 3; i++) {
    const t1 = bars1[i]!.time;
    const w1 = sliceBars(bars1, i, 40);
    const w5 = windowEndingAt(bars5, t1, 40);
    const w1h = windowEndingAt(bars1h, t1, 80);
    const sample: "in" | "out" = i < inSampleEnd ? "in" : "out";
    const raw = [
      evaluateMicroBreakout1m(w1, null),
      evaluateMomentumIgnition1m(w1, { isTop5Gainer1h: top5.has(pair) }),
      evaluateCapitulationReversal1m(w1, "ALCISTA"),
      evaluateVwapBounce5m(w5.length ? w5 : w1, w1h),
    ];
    for (const sig of raw) {
      const id = sig.strategyId;
      if (!signalCounts[id]) signalCounts[id] = { attempts: 0, buys: 0, holds: [] };
      signalCounts[id]!.attempts += 1;
      if (sig.direction !== "BUY") {
        const reason = sig.reasoning.slice(0, 80);
        const holds = signalCounts[id]!.holds;
        if (holds.length < 5 && !holds.includes(reason)) holds.push(reason);
        continue;
      }
      signalCounts[id]!.buys += 1;
      const cost = fastRoundTripCost(0.0005);
      if (sig.expectedMovePct < cost * 3) continue;

      const entryBarIndex = i + 1;
      const entryPrice = bars1[entryBarIndex]!.open;
      const scaled = rescaleStopsToEntry(
        entryPrice,
        sig.entry > 0 ? sig.entry : bars1[i]!.close,
        sig.stopLoss,
        sig.takeProfit,
      );
      const maxBars = Math.max(2, Math.floor(sig.maxHoldMs / 60_000));
      const fill = simulateLongTrade({
        bars: bars1,
        entryBarIndex,
        entryPrice,
        stopLoss: scaled.stop,
        takeProfit: scaled.tp,
        maxBars,
      });
      if (!fill) continue;
      // Remap net with maker+maker fees
      const gross = (fill.exit - entryPrice) / entryPrice;
      const netPct = (gross - cost) * 100;
      trades.push({
        strategy: sig.strategyId,
        pair,
        entry: fill.entry,
        exit: fill.exit,
        netPct,
        win: netPct > 0,
        mfePct: fill.mfePct,
        maePct: fill.maePct,
        liquidity: liq,
        sample,
      });
      break;
    }
  }
  return trades;
}

function summarize(trades: Trade[], sample?: "in" | "out") {
  const list = sample ? trades.filter((t) => t.sample === sample) : trades;
  const by = new Map<string, Trade[]>();
  for (const t of list) {
    const k = `${t.strategy}|${t.liquidity}`;
    if (!by.has(k)) by.set(k, []);
    by.get(k)!.push(t);
  }
  const rows: Array<{
    strategy: string;
    liquidity: string;
    n: number;
    winRate: number;
    avgNet: number;
    pf: number;
    maxDd: number;
    worstStreak: number;
    avgMfe: number;
    avgMae: number;
  }> = [];
  for (const [k, ts] of by) {
    const [strategy, liquidity] = k.split("|");
    const wins = ts.filter((t) => t.win);
    const grossWin = wins.reduce((s, t) => s + Math.max(0, t.netPct), 0);
    const grossLoss = ts
      .filter((t) => !t.win)
      .reduce((s, t) => s + Math.abs(t.netPct), 0);
    let streak = 0;
    let worst = 0;
    for (const t of ts) {
      if (t.netPct < 0) {
        streak += 1;
        worst = Math.max(worst, streak);
      } else streak = 0;
    }
    rows.push({
      strategy: strategy!,
      liquidity: liquidity!,
      n: ts.length,
      winRate: ts.length ? wins.length / ts.length : 0,
      avgNet: ts.reduce((s, t) => s + t.netPct, 0) / Math.max(1, ts.length),
      pf: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
      maxDd: compoundMaxDrawdownPct(ts.map((t) => t.netPct)),
      worstStreak: worst,
      avgMfe: ts.reduce((s, t) => s + t.mfePct, 0) / Math.max(1, ts.length),
      avgMae: ts.reduce((s, t) => s + t.maePct, 0) / Math.max(1, ts.length),
    });
  }
  return rows.sort((a, b) => b.avgNet - a.avgNet);
}

function rowTable(
  rows: ReturnType<typeof summarize>,
): string[] {
  return rows.map(
    (r) =>
      `| ${r.strategy} | ${r.liquidity} | ${r.n} | ${(r.winRate * 100).toFixed(0)}% | ${r.avgNet.toFixed(2)} | ${r.pf.toFixed(2)} | ${r.maxDd.toFixed(2)} | ${r.worstStreak} | ${r.avgMfe.toFixed(2)} | ${r.avgMae.toFixed(2)} |`,
  );
}

async function main(): Promise<void> {
  console.log(`[Backtest] root=${ROOT} apply=${APPLY}`);
  const pairs = await topPairs();
  console.log(`[Backtest] pairs=${pairs.length}`);
  const all: Trade[] = [];
  const signalCounts: SignalCount = {};
  for (const id of ALL_CRYPTO_STRATEGY_IDS) {
    signalCounts[id] = { attempts: 0, buys: 0, holds: [] };
  }

  // Prefetch BTC for RS
  let btc1h: Bar[] = [];
  try {
    btc1h = await fetchOhlc("XXBTZEUR", 60);
  } catch {
    btc1h = [];
  }

  const pairBars = new Map<
    string,
    { b1: Bar[]; b5: Bar[]; b15: Bar[]; b1h: Bar[]; vol: number }
  >();
  for (const { pair, volEur } of pairs.slice(0, 40)) {
    const krakenPair =
      pair === "XBTEUR" || pair.startsWith("XBT")
        ? "XXBTZEUR"
        : pair.replace(/^XBT/, "XXBT");
    try {
      const bars15 = await fetchOhlc(krakenPair, 15);
      const bars5 = await fetchOhlc(krakenPair, 5);
      const bars1h = await fetchOhlc(krakenPair, 60);
      const bars1 = await fetchOhlc(krakenPair, 1);
      pairBars.set(pair, {
        b1: bars1,
        b5: bars5,
        b15: bars15,
        b1h: bars1h,
        vol: volEur,
      });
    } catch (err) {
      console.warn(`[Backtest] ${pair}:`, err instanceof Error ? err.message : err);
    }
  }

  const topRs = new Set(
    topRsPairsVsBtc(
      [...pairBars.keys()],
      (p) => pairBars.get(p)?.b1h ?? [],
      btc1h,
      3,
    ),
  );
  const top5 = new Set(
    topGainerPairs1h(
      [...pairBars.keys()],
      (p) => pairBars.get(p)?.b1h ?? [],
      5,
    ),
  );

  for (const [pair, data] of pairBars) {
    const trades = simulatePair(
      pair,
      data.b5,
      data.b15,
      data.b1h,
      btc1h,
      data.vol,
      30,
      signalCounts,
      topRs,
    );
    const fast = simulateFastPair(
      pair,
      data.b1,
      data.b5,
      data.b1h,
      data.vol,
      7,
      signalCounts,
      top5,
    );
    all.push(...trades, ...fast);
    console.log(
      `[Backtest] ${pair}: ${trades.length} std + ${fast.length} fast vol≈€${(data.vol / 1e6).toFixed(1)}M`,
    );
  }

  const inRows = summarize(all, "in");
  const outRows = summarize(all, "out");
  const liqBuckets = new Set(all.map((t) => t.liquidity));
  for (const b of [">5M", "1-5M", "0.3-1M"] as const) {
    if (!liqBuckets.has(b)) {
      console.warn(`[Backtest] falta liquidez ${b} en trades — pares insuficientes o filtro volume`);
    }
  }

  const pfBy: Partial<Record<CryptoStrategyId, number>> = {};
  const oosCount: Partial<Record<CryptoStrategyId, number>> = {};
  for (const id of ALL_CRYPTO_STRATEGY_IDS) {
    const subset = outRows.filter((r) => r.strategy === id);
    const n = subset.reduce((s, r) => s + r.n, 0);
    oosCount[id] = n;
    if (!subset.length) continue;
    pfBy[id] =
      subset.reduce((s, r) => s + r.pf * r.n, 0) / Math.max(1, n);
  }

  if (APPLY) {
    const msgs = await applyBacktestDegradation(pfBy, { minOosTrades: 20, oosCount });
    console.log(`[Backtest] apply degradation:`, msgs);
  } else {
    console.log(
      `[Backtest] dry-run — no status changes (pass --apply for nightly degrade ≥20 OOS)`,
    );
  }

  const date = new Date().toISOString().slice(0, 10);
  const reportDir = path.join(ROOT, ".forgeos", "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const zeroNotes = ALL_CRYPTO_STRATEGY_IDS.map((id) => {
    const sc = signalCounts[id]!;
    const oos = oosCount[id] ?? 0;
    if (oos > 0 && sc.buys > 0) return null;
    const why =
      sc.attempts === 0
        ? "no evaluada (datos/universo)"
        : sc.buys === 0
          ? `0 BUY / ${sc.attempts} intentos — ${sc.holds.slice(0, 3).join("; ") || "filtros"}`
          : `BUY=${sc.buys} pero 0 trades OOS (fills/coste)`;
    return `- **${id}**: ${why}`;
  }).filter(Boolean);

  const md = [
    `# Crypto backtest ${date}`,
    ``,
    `Pairs=${pairBars.size} trades=${all.length} (in=${all.filter((t) => t.sample === "in").length} out=${all.filter((t) => t.sample === "out").length})`,
    `Costs: maker ${(BT_MAKER * 100).toFixed(2)}% + taker ${(BT_TAKER * 100).toFixed(2)}% / side`,
    `Apply degradation: ${APPLY ? "yes (≥20 OOS)" : "no (dry-run)"}`,
    `Liquidity buckets present: ${[...liqBuckets].join(", ") || "none"}`,
    ``,
    `## Out of sample (last ~10d)`,
    `| Strategy | Liq | N | WR | AvgNet% | PF | MaxDD% | Worst | MFE | MAE |`,
    `|---|---|---:|---:|---:|---:|---:|---:|---:|---:|`,
    ...rowTable(outRows),
    ``,
    `## In sample (first ~20d)`,
    `| Strategy | Liq | N | WR | AvgNet% | PF | MaxDD% | Worst | MFE | MAE |`,
    `|---|---|---:|---:|---:|---:|---:|---:|---:|---:|`,
    ...rowTable(inRows),
    ``,
    `## Signal attempts (all strategies)`,
    ...ALL_CRYPTO_STRATEGY_IDS.map((id) => {
      const sc = signalCounts[id]!;
      return `- ${id}: attempts=${sc.attempts} buys=${sc.buys} oos_trades=${oosCount[id] ?? 0}`;
    }),
    ``,
    `## Zero / low activity notes`,
    ...(zeroNotes.length ? zeroNotes : ["- (todas las estrategias generaron trades OOS)"]),
  ].join("\n");

  const outFile = path.join(reportDir, `crypto-backtest-${date}.md`);
  fs.writeFileSync(outFile, md, "utf8");
  console.log(`[Backtest] wrote ${outFile}`);

  try {
    const { sendTelegramMessage } = await import(
      "../lib/notifications/telegram-bot"
    );
    const top = outRows.slice(0, 8);
    await sendTelegramMessage(
      `📈 <b>Backtest crypto ${date}</b> (${APPLY ? "apply" : "dry"})\n` +
        (top.length
          ? top
              .map(
                (r) =>
                  `${r.strategy} ${r.liquidity}: n=${r.n} WR=${(r.winRate * 100).toFixed(0)}% net=${r.avgNet.toFixed(2)}% PF=${r.pf.toFixed(2)} DD=${r.maxDd.toFixed(1)}%`,
              )
              .join("\n")
          : "sin trades OOS"),
    );
  } catch (err) {
    console.warn(
      "[Backtest] Telegram:",
      err instanceof Error ? err.message : err,
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
