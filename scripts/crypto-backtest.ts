/**
 * Nightly Kraken crypto backtester — reuses strategy evaluators + exit rules.
 *
 *   npx tsx --require ./scripts/stub-server-only.cjs scripts/crypto-backtest.ts
 *
 * Outputs: .forgeos/reports/crypto-backtest-<date>.md + Telegram ranking.
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
import { applyBacktestDegradation } from "../lib/trading/crypto/strategy-status";
import type { Bar } from "../lib/brokers/kraken/market-store";

const ROOT = process.env.FORGEOS_ROOT?.trim() || path.resolve(__dirname, "..");
process.env.FORGEOS_ROOT = ROOT;

const MAKER = 0.0025;
const TAKER = 0.004;
const CACHE = path.join(ROOT, ".forgeos", "cache", "kraken-ohlc");

function estimateRoundTripCostPct(spreadPct: number): number {
  return MAKER + TAKER + Math.max(0, spreadPct) * 2;
}

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
};

async function fetchOhlc(
  pair: string,
  interval: 5 | 15 | 60,
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
  const rows = result[key] as Array<[number, string, string, string, string, string, string, string]>;
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
    result?: Record<string, { v?: string[]; c?: string[]; a?: string[]; b?: string[] }>;
  };
  const out: Array<{ pair: string; volEur: number; spread: number }> = [];
  for (const [k, v] of Object.entries(json.result ?? {})) {
    if (!/EUR$/.test(k) && !/ZEUR$/.test(k)) continue;
    const pair = k.replace(/^X/, "").replace(/ZEUR$/, "EUR").replace(/XBT/, "XBT");
    const norm = pair.includes("EUR") ? pair : `${pair}EUR`;
    const vol = Number(v.v?.[1] ?? 0);
    const px = Number(v.c?.[0] ?? 0);
    const ask = Number(v.a?.[0] ?? 0);
    const bid = Number(v.b?.[0] ?? 0);
    const spread = ask > 0 && bid > 0 ? (ask - bid) / ((ask + bid) / 2) : 1;
    if (spread >= 0.005) continue;
    out.push({ pair: norm.replace("XBT", "XBT"), volEur: vol * px, spread });
  }
  // Prefer common EUR pairs
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
    ...preferred.filter((p) => mapped.some((m) => m.pair.includes(p.slice(0, 3)))),
    ...mapped.map((m) => m.pair),
  ];
  const uniq = [...new Set(picks)].slice(0, 60);
  return uniq.map((pair) => ({
    pair,
    volEur: mapped.find((m) => m.pair === pair)?.volEur ?? 1_000_000,
  }));
}

function liquidityBucket(volEur: number): string {
  if (volEur > 5_000_000) return ">5M";
  if (volEur > 1_000_000) return "1-5M";
  return "0.3-1M";
}

function sliceBars(bars: Bar[], endIdx: number, n: number): Bar[] {
  return bars.slice(Math.max(0, endIdx - n + 1), endIdx + 1);
}

function simulatePair(
  pair: string,
  bars5: Bar[],
  bars15: Bar[],
  bars1h: Bar[],
  volEur: number,
  optDays: number,
): Trade[] {
  const trades: Trade[] = [];
  if (bars15.length < 150) return trades;
  const liq = liquidityBucket(volEur);
  const start = Math.max(120, bars15.length - optDays * 96);
  for (let i = start; i < bars15.length - 2; i++) {
    const w15 = sliceBars(bars15, i, 150);
    const w5 = bars5.length
      ? sliceBars(bars5, Math.min(bars5.length - 1, Math.floor((i * 3))), 80)
      : w15;
    const w1h = bars1h.length
      ? sliceBars(bars1h, Math.min(bars1h.length - 1, Math.floor(i / 4)), 220)
      : w15;
    const regime = "ALCISTA" as const;
    const signals = [
      evaluateTrendPullback1h(w1h),
      evaluateRsiMeanReversion15m(w15, w1h),
      evaluateMomentumBreakout5m(w5, w1h),
      evaluateVwapReclaim15m(w15),
      evaluateRangeGrid15m(w15, "LATERAL", 0),
      evaluateRsi2Trend5m(w5, w1h),
      evaluateLiquiditySweep15m(w15),
      evaluateBbSqueezeBreakout15m(w15),
      evaluateEmaCross15m(w15, w1h),
      evaluateSessionOpenBreakout(
        w15,
        new Date((bars15[i]!.time ?? 0) * 1000),
      ),
    ].filter((s) => s.direction === "BUY");

    for (const sig of signals) {
      const cost = estimateRoundTripCostPct(0.001);
      if (sig.expectedMovePct < cost * 3) continue;
      // Next bar entry (no lookahead)
      const entryBar = bars15[i + 1]!;
      const entry = entryBar.open;
      let exit = entry;
      let mfe = 0;
      let mae = 0;
      let exited = false;
      const maxBars = Math.max(4, Math.floor(sig.maxHoldMs / (15 * 60_000)));
      for (let j = i + 1; j < Math.min(bars15.length, i + 1 + maxBars); j++) {
        const b = bars15[j]!;
        mfe = Math.max(mfe, (b.high - entry) / entry);
        mae = Math.min(mae, (b.low - entry) / entry);
        if (b.low <= sig.stopLoss) {
          exit = sig.stopLoss;
          exited = true;
          break;
        }
        if (b.high >= sig.takeProfit) {
          exit = sig.takeProfit;
          exited = true;
          break;
        }
        if (sig.strategyId === "RSI2_TREND_5M") {
          const reason = rsi2TrendShouldExit(
            sliceBars(bars5.length ? bars5 : bars15, j, 40),
            entry,
            (bars15[i + 1]!.time ?? 0) * 1000,
            (b.time ?? 0) * 1000,
          );
          if (reason) {
            exit = b.close;
            exited = true;
            break;
          }
        }
      }
      if (!exited) exit = bars15[Math.min(bars15.length - 1, i + maxBars)]!.close;
      const gross = (exit - entry) / entry;
      const fees = MAKER + TAKER; // entry maker, exit taker
      const netPct = (gross - fees) * 100;
      trades.push({
        strategy: sig.strategyId,
        pair,
        entry,
        exit,
        netPct,
        win: netPct > 0,
        mfePct: mfe * 100,
        maePct: mae * 100,
        liquidity: liq,
      });
      void regime;
      break; // one signal per bar/pair
    }
  }
  return trades;
}

function summarize(trades: Trade[]) {
  const by = new Map<string, Trade[]>();
  for (const t of trades) {
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
  for (const [k, list] of by) {
    const [strategy, liquidity] = k.split("|");
    const wins = list.filter((t) => t.win);
    const grossWin = wins.reduce((s, t) => s + Math.max(0, t.netPct), 0);
    const grossLoss = list
      .filter((t) => !t.win)
      .reduce((s, t) => s + Math.abs(t.netPct), 0);
    let eq = 0;
    let peak = 0;
    let maxDd = 0;
    let streak = 0;
    let worst = 0;
    for (const t of list) {
      eq += t.netPct;
      peak = Math.max(peak, eq);
      maxDd = Math.max(maxDd, peak - eq);
      if (t.netPct < 0) {
        streak += 1;
        worst = Math.max(worst, streak);
      } else streak = 0;
    }
    rows.push({
      strategy: strategy!,
      liquidity: liquidity!,
      n: list.length,
      winRate: list.length ? wins.length / list.length : 0,
      avgNet: list.reduce((s, t) => s + t.netPct, 0) / Math.max(1, list.length),
      pf: grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 99 : 0,
      maxDd,
      worstStreak: worst,
      avgMfe: list.reduce((s, t) => s + t.mfePct, 0) / Math.max(1, list.length),
      avgMae: list.reduce((s, t) => s + t.maePct, 0) / Math.max(1, list.length),
    });
  }
  return rows.sort((a, b) => b.avgNet - a.avgNet);
}

async function main(): Promise<void> {
  console.log(`[Backtest] root=${ROOT}`);
  const pairs = await topPairs();
  console.log(`[Backtest] pairs=${pairs.length}`);
  const all: Trade[] = [];
  for (const { pair, volEur } of pairs.slice(0, 25)) {
    const krakenPair = pair.startsWith("XBT") ? "XXBTZEUR" : pair;
    try {
      const bars15 = await fetchOhlc(krakenPair, 15);
      const bars5 = await fetchOhlc(krakenPair, 5);
      const bars1h = await fetchOhlc(krakenPair, 60);
      const trades = simulatePair(pair, bars5, bars15, bars1h, volEur, 30);
      all.push(...trades);
      console.log(`[Backtest] ${pair}: ${trades.length} trades`);
    } catch (err) {
      console.warn(`[Backtest] ${pair}:`, err instanceof Error ? err.message : err);
    }
  }

  const optCut = Math.floor(all.length * (20 / 30));
  const validate = all.slice(optCut);
  const rows = summarize(validate.length ? validate : all);
  const pfBy: Partial<Record<CryptoStrategyId, number>> = {};
  for (const id of ALL_CRYPTO_STRATEGY_IDS) {
    const subset = rows.filter((r) => r.strategy === id);
    if (!subset.length) continue;
    const n = subset.reduce((s, r) => s + r.n, 0);
    const pf =
      subset.reduce((s, r) => s + r.pf * r.n, 0) / Math.max(1, n);
    pfBy[id] = pf;
  }
  await applyBacktestDegradation(pfBy);

  const date = new Date().toISOString().slice(0, 10);
  const reportDir = path.join(ROOT, ".forgeos", "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const md = [
    `# Crypto backtest ${date}`,
    ``,
    `Pairs=${pairs.length} trades=${all.length} (validate≈${validate.length})`,
    `Costs: maker ${(MAKER * 100).toFixed(2)}% + taker ${(TAKER * 100).toFixed(2)}% / side`,
    ``,
    `| Strategy | Liq | N | WR | AvgNet% | PF | MaxDD% | Worst | MFE | MAE |`,
    `|---|---|---:|---:|---:|---:|---:|---:|---:|---:|`,
    ...rows.map(
      (r) =>
        `| ${r.strategy} | ${r.liquidity} | ${r.n} | ${(r.winRate * 100).toFixed(0)}% | ${r.avgNet.toFixed(2)} | ${r.pf.toFixed(2)} | ${r.maxDd.toFixed(2)} | ${r.worstStreak} | ${r.avgMfe.toFixed(2)} | ${r.avgMae.toFixed(2)} |`,
    ),
  ].join("\n");
  const outFile = path.join(reportDir, `crypto-backtest-${date}.md`);
  fs.writeFileSync(outFile, md, "utf8");
  console.log(`[Backtest] wrote ${outFile}`);

  try {
    const { sendTelegramMessage } = await import(
      "../lib/notifications/telegram-bot"
    );
    const top = rows.slice(0, 8);
    await sendTelegramMessage(
      `📈 <b>Backtest crypto ${date}</b>\n` +
        top
          .map(
            (r) =>
              `${r.strategy} ${r.liquidity}: n=${r.n} WR=${(r.winRate * 100).toFixed(0)}% net=${r.avgNet.toFixed(2)}% PF=${r.pf.toFixed(2)}`,
          )
          .join("\n"),
    );
  } catch {
    /* telegram optional */
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
