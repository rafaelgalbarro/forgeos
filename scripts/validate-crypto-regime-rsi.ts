/**
 * H validation: regime decline_confirm vs legacy (30d) + TREND_PULLBACK RSI 35-60 vs 40-55.
 * Uses real account fees (maker 0.40% / taker 0.80%).
 *
 *   npx tsx --require ./scripts/stub-server-only.cjs scripts/validate-crypto-regime-rsi.ts
 *
 * Writes .forgeos/cache/crypto-regime-rsi-validation.json and prints adopt decisions.
 */

import fs from "node:fs";
import path from "node:path";
import type { Bar } from "../lib/brokers/kraken/market-store";
import {
  allowedStrategiesForRegimeValue,
  classifyRawRegime,
  regimeInputsFromBars,
  type MarketRegime,
  type RegimeRuleVersion,
} from "../lib/trading/crypto/regime";
import {
  evaluateTrendPullback1h,
  TREND_PULLBACK_RSI_MAX,
  TREND_PULLBACK_RSI_MAX_WIDE,
  TREND_PULLBACK_RSI_MIN,
  TREND_PULLBACK_RSI_MIN_WIDE,
} from "../lib/trading/crypto/strategies/trend-pullback-1h";
import { evaluateRsiMeanReversion15m } from "../lib/trading/crypto/strategies/rsi-mean-reversion-15m";
import { evaluateMomentumBreakout5m } from "../lib/trading/crypto/strategies/momentum-breakout-5m";
import { evaluateVwapReclaim15m } from "../lib/trading/crypto/strategies/vwap-reclaim-15m";
import { evaluateRangeGrid15m } from "../lib/trading/crypto/strategies/range-grid-15m";
import { evaluateLiquiditySweep15m } from "../lib/trading/crypto/strategies/liquidity-sweep-15m";
import { evaluateEmaCross15m } from "../lib/trading/crypto/strategies/ema-cross-15m";
import { evaluateRsVsBtc1h } from "../lib/trading/crypto/strategies/rs-vs-btc-1h";
import {
  getBacktestMakerFee,
  getBacktestTakerFee,
  netPnlPctFromPrices,
  roundTripCostFraction,
  simulateLongTrade,
} from "../lib/trading/crypto/backtest-core";
import type { CryptoStrategyId } from "../lib/trading/crypto/strategies/types";

const ROOT = process.env.FORGEOS_ROOT?.trim() || path.resolve(__dirname, "..");
process.env.FORGEOS_ROOT = ROOT;
const CACHE = path.join(ROOT, ".forgeos", "cache", "kraken-ohlc");
const OUT = path.join(ROOT, ".forgeos", "cache", "crypto-regime-rsi-validation.json");

async function fetchOhlcPage(
  pair: string,
  interval: 5 | 15 | 60,
  since?: number,
): Promise<{ bars: Bar[]; last: number | null }> {
  let url = `https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(pair)}&interval=${interval}`;
  if (since != null) url += `&since=${since}`;
  const res = await fetch(url);
  const json = (await res.json()) as {
    error?: string[];
    result?: Record<string, unknown>;
  };
  if (json.error?.length) return { bars: [], last: null };
  const result = json.result ?? {};
  const lastRaw = result.last;
  const last =
    typeof lastRaw === "number"
      ? lastRaw
      : typeof lastRaw === "string"
        ? Number(lastRaw)
        : null;
  const key = Object.keys(result).find((k) => k !== "last");
  if (!key) return { bars: [], last };
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
  return { bars, last: Number.isFinite(last) ? last : null };
}

/** Paginate OHLC to cover ~days (Kraken caps ~720/request). */
async function fetchOhlc(
  pair: string,
  interval: 5 | 15 | 60,
  days: number,
): Promise<Bar[]> {
  const cacheFile = path.join(CACHE, `${pair}_${interval}_${days}d.json`);
  try {
    if (fs.existsSync(cacheFile)) {
      const age = Date.now() - fs.statSync(cacheFile).mtimeMs;
      if (age < 6 * 3600_000) {
        return JSON.parse(fs.readFileSync(cacheFile, "utf8")) as Bar[];
      }
    }
  } catch {
    /* fetch */
  }

  const need = Math.ceil((days * 24 * 60) / interval) + 50;
  const sinceSec = Math.floor(Date.now() / 1000) - days * 24 * 3600 - 3600;
  const byTime = new Map<number, Bar>();
  let since: number | undefined = sinceSec;
  for (let page = 0; page < 12; page++) {
    const { bars, last } = await fetchOhlcPage(pair, interval, since);
    for (const b of bars) byTime.set(b.time, b);
    if (!bars.length || last == null) break;
    const maxT = Math.max(...bars.map((b) => b.time));
    if (byTime.size >= need && maxT >= Date.now() / 1000 - interval * 60) break;
    if (last <= (since ?? 0)) break;
    since = last;
    await new Promise((r) => setTimeout(r, 350));
  }
  const out = [...byTime.values()].sort((a, b) => a.time - b.time);
  fs.mkdirSync(CACHE, { recursive: true });
  fs.writeFileSync(cacheFile, JSON.stringify(out), "utf8");
  return out;
}

function windowEndingAt(bars: Bar[], targetTime: number, n: number): Bar[] {
  if (!bars.length) return [];
  let end = bars.length - 1;
  while (end > 0 && bars[end]!.time > targetTime) end -= 1;
  return bars.slice(Math.max(0, end - n + 1), end + 1);
}

function sliceBars(bars: Bar[], endIdx: number, n: number): Bar[] {
  return bars.slice(Math.max(0, endIdx - n + 1), endIdx + 1);
}

function countRegimeHours(
  btc1h: Bar[],
  eth1h: Bar[],
  rule: RegimeRuleVersion,
  days: number,
): Record<MarketRegime, number> {
  const hours: Record<MarketRegime, number> = {
    ALCISTA: 0,
    LATERAL: 0,
    BAJISTA: 0,
  };
  const start = Math.max(220, btc1h.length - days * 24);
  for (let i = start; i < btc1h.length; i++) {
    const wBtc = btc1h.slice(Math.max(0, i - 219), i + 1);
    const wEth = eth1h.slice(Math.max(0, i - 219), i + 1);
    const inputs = regimeInputsFromBars(wBtc, wEth);
    const r = classifyRawRegime(inputs, rule);
    hours[r] += 1;
  }
  return hours;
}

type TradeRow = {
  strategy: string;
  netPct: number;
  sample: "in" | "out";
};

function strategyAllowed(id: string, regime: MarketRegime): boolean {
  const allowed = allowedStrategiesForRegimeValue(regime);
  if (allowed === "all") return true;
  return allowed.has(id);
}

function simulateUnderRegime(
  bars5: Bar[],
  bars15: Bar[],
  bars1h: Bar[],
  btc1h: Bar[],
  eth1h: Bar[],
  rule: RegimeRuleVersion,
  days: number,
  rsiBand: { min: number; max: number },
): TradeRow[] {
  const trades: TradeRow[] = [];
  if (bars15.length < 150 || bars1h.length < 80) return trades;
  const start = Math.max(120, bars15.length - days * 96);
  const inSampleEnd = start + Math.floor((bars15.length - start) * (20 / 30));

  for (let i = start; i < bars15.length - 3; i++) {
    const t15 = bars15[i]!.time;
    const w15 = sliceBars(bars15, i, 150);
    const w5 = windowEndingAt(bars5, t15, 80);
    const w1h = windowEndingAt(bars1h, t15, 220);
    const wBtc = windowEndingAt(btc1h, t15, 220);
    const wEth = windowEndingAt(eth1h, t15, 220);
    const sample: "in" | "out" = i < inSampleEnd ? "in" : "out";

    const inputs = regimeInputsFromBars(wBtc, wEth);
    const regime = classifyRawRegime(inputs, rule);
    if (regime === "BAJISTA") continue;

    const raw = [
      evaluateTrendPullback1h(w1h, {
        rsiMin: rsiBand.min,
        rsiMax: rsiBand.max,
      }),
      evaluateRsiMeanReversion15m(w15, w1h),
      evaluateMomentumBreakout5m(w5.length ? w5 : w15, w1h),
      evaluateVwapReclaim15m(w15),
      evaluateRangeGrid15m(w15, regime, 0, {
        signalBarIndex: w15.length - 1,
        excludeSignalBarFromRange: true,
      }),
      evaluateLiquiditySweep15m(w15),
      evaluateEmaCross15m(w15, w1h),
      evaluateRsVsBtc1h(w15, w1h, wBtc, regime, { isTop3Rs: true }),
    ];

    for (const sig of raw) {
      if (sig.direction !== "BUY") continue;
      if (!strategyAllowed(sig.strategyId, regime)) continue;
      const cost = roundTripCostFraction(0.001);
      if (sig.expectedMovePct < cost * 3) continue;

      const entryBarIndex = i + 1;
      const entryPrice = bars15[entryBarIndex]!.open;
      const maxBars = Math.max(4, Math.floor(sig.maxHoldMs / (15 * 60_000)));
      const fill = simulateLongTrade({
        bars: bars15,
        entryBarIndex,
        entryPrice,
        stopLoss:
          sig.entry > 0
            ? entryPrice * (sig.stopLoss / sig.entry)
            : sig.stopLoss,
        takeProfit:
          sig.entry > 0
            ? entryPrice * (sig.takeProfit / sig.entry)
            : sig.takeProfit,
        maxBars,
      });
      if (!fill) continue;
      const netPct =
        fill.exitKind === "take_profit"
          ? netPnlPctFromPrices(entryPrice, fill.exit, {
              entryFee: getBacktestMakerFee(),
              exitFee: getBacktestMakerFee(),
            })
          : netPnlPctFromPrices(entryPrice, fill.exit);
      trades.push({
        strategy: sig.strategyId as CryptoStrategyId,
        netPct,
        sample,
      });
      break;
    }
  }
  return trades;
}

/** Walk 1h bars for TREND_PULLBACK RSI A/B (native TF). */
function simulateTrendPullbackRsi(
  bars1h: Bar[],
  btc1h: Bar[],
  eth1h: Bar[],
  days: number,
  band: { min: number; max: number },
): TradeRow[] {
  const trades: TradeRow[] = [];
  if (bars1h.length < 80) return trades;
  const start = Math.max(60, bars1h.length - days * 24);
  const inSampleEnd = start + Math.floor((bars1h.length - start) * (20 / 30));

  for (let i = start; i < bars1h.length - 3; i++) {
    const w1h = sliceBars(bars1h, i, 220);
    const t = bars1h[i]!.time;
    const wBtc = windowEndingAt(btc1h, t, 220);
    const wEth = windowEndingAt(eth1h, t, 220);
    const regime = classifyRawRegime(
      regimeInputsFromBars(wBtc, wEth),
      "decline_confirm",
    );
    if (!strategyAllowed("TREND_PULLBACK_1H", regime)) continue;
    const sample: "in" | "out" = i < inSampleEnd ? "in" : "out";
    const sig = evaluateTrendPullback1h(w1h, {
      rsiMin: band.min,
      rsiMax: band.max,
    });
    if (sig.direction !== "BUY") continue;
    const cost = roundTripCostFraction(0.001);
    if (sig.expectedMovePct < cost * 3) continue;
    const entryBarIndex = i + 1;
    const entryPrice = bars1h[entryBarIndex]!.open;
    const fill = simulateLongTrade({
      bars: bars1h,
      entryBarIndex,
      entryPrice,
      stopLoss:
        sig.entry > 0 ? entryPrice * (sig.stopLoss / sig.entry) : sig.stopLoss,
      takeProfit:
        sig.entry > 0
          ? entryPrice * (sig.takeProfit / sig.entry)
          : sig.takeProfit,
      maxBars: Math.max(2, Math.floor(sig.maxHoldMs / 3600_000)),
    });
    if (!fill) continue;
    const netPct =
      fill.exitKind === "take_profit"
        ? netPnlPctFromPrices(entryPrice, fill.exit, {
            entryFee: getBacktestMakerFee(),
            exitFee: getBacktestMakerFee(),
          })
        : netPnlPctFromPrices(entryPrice, fill.exit);
    trades.push({ strategy: "TREND_PULLBACK_1H", netPct, sample });
  }
  return trades;
}

function summarize(trades: TradeRow[], sample?: "in" | "out") {
  const list = sample ? trades.filter((t) => t.sample === sample) : trades;
  const n = list.length;
  const sum = list.reduce((s, t) => s + t.netPct, 0);
  const wins = list.filter((t) => t.netPct > 0).length;
  const byStrat = new Map<string, number>();
  for (const t of list) {
    byStrat.set(t.strategy, (byStrat.get(t.strategy) ?? 0) + t.netPct);
  }
  return {
    n,
    sumNet: sum,
    avgNet: n ? sum / n : 0,
    winRate: n ? wins / n : 0,
    byStrategy: Object.fromEntries(byStrat),
  };
}

async function main(): Promise<void> {
  const maker = getBacktestMakerFee();
  const taker = getBacktestTakerFee();
  console.log(
    `[Validate] fees maker=${(maker * 100).toFixed(2)}% taker=${(taker * 100).toFixed(2)}%`,
  );

  const days = 30;
  const btc1h = await fetchOhlc("XXBTZEUR", 60, days + 10);
  const eth1h = await fetchOhlc("XETHZEUR", 60, days + 10);
  console.log(`[Validate] BTC 1h bars=${btc1h.length} ETH=${eth1h.length}`);

  const hoursLegacy = countRegimeHours(btc1h, eth1h, "legacy", days);
  const hoursNew = countRegimeHours(btc1h, eth1h, "decline_confirm", days);
  console.log("[Validate] regime hours legacy:", hoursLegacy);
  console.log("[Validate] regime hours decline_confirm:", hoursNew);

  const pairs = [
    "XXBTZEUR",
    "XETHZEUR",
    "SOLEUR",
    "ADAEUR",
    "DOTEUR",
    "AVAXEUR",
    "LINKEUR",
    "XDGEUR",
    "LTCEUR",
    "ATOMEUR",
  ];

  const narrow = {
    min: TREND_PULLBACK_RSI_MIN,
    max: TREND_PULLBACK_RSI_MAX,
  };
  const wide = {
    min: TREND_PULLBACK_RSI_MIN_WIDE,
    max: TREND_PULLBACK_RSI_MAX_WIDE,
  };

  const regimeLegacyTrades: TradeRow[] = [];
  const regimeNewTrades: TradeRow[] = [];
  const rsiNarrowTrades: TradeRow[] = [];
  const rsiWideTrades: TradeRow[] = [];

  for (const pair of pairs) {
    const bars15 = await fetchOhlc(pair, 15, days + 2);
    const bars5 = await fetchOhlc(pair, 5, Math.min(days, 10));
    const bars1h = await fetchOhlc(pair, 60, days + 10);
    console.log(
      `[Validate] ${pair} 15m=${bars15.length} 5m=${bars5.length} 1h=${bars1h.length}`,
    );

    regimeLegacyTrades.push(
      ...simulateUnderRegime(
        bars5,
        bars15,
        bars1h,
        btc1h,
        eth1h,
        "legacy",
        days,
        narrow,
      ),
    );
    regimeNewTrades.push(
      ...simulateUnderRegime(
        bars5,
        bars15,
        bars1h,
        btc1h,
        eth1h,
        "decline_confirm",
        days,
        narrow,
      ),
    );

    rsiNarrowTrades.push(
      ...simulateTrendPullbackRsi(bars1h, btc1h, eth1h, days, narrow),
    );
    rsiWideTrades.push(
      ...simulateTrendPullbackRsi(bars1h, btc1h, eth1h, days, wide),
    );
  }

  const legSum = summarize(regimeLegacyTrades);
  const newSum = summarize(regimeNewTrades);
  const legOos = summarize(regimeLegacyTrades, "out");
  const newOos = summarize(regimeNewTrades, "out");
  const rsiN = summarize(rsiNarrowTrades);
  const rsiW = summarize(rsiWideTrades);
  const rsiNOos = summarize(rsiNarrowTrades, "out");
  const rsiWOos = summarize(rsiWideTrades, "out");

  // If legacy OOS is starved by BAJISTA (<5 trades), fall back to all-sample.
  const regimeCmpLegacy = legOos.n >= 5 ? legOos : legSum;
  const regimeCmpNew = legOos.n >= 5 ? newOos : newSum;
  const adoptRegime = regimeCmpNew.sumNet >= regimeCmpLegacy.sumNet - 0.01;

  const rsiCmpNarrow = rsiNOos.n >= 5 ? rsiNOos : rsiN;
  const rsiCmpWide = rsiNOos.n >= 5 ? rsiWOos : rsiW;
  const adoptRsiWide = rsiCmpWide.sumNet > rsiCmpNarrow.sumNet + 0.01;

  const report = {
    at: new Date().toISOString(),
    fees: { maker, taker },
    days,
    regimeHours: { legacy: hoursLegacy, decline_confirm: hoursNew },
    strategyNet: {
      legacy: { all: legSum, oos: legOos },
      decline_confirm: { all: newSum, oos: newOos },
    },
    trendPullbackRsi: {
      narrow_40_55: { all: rsiN, oos: rsiNOos },
      wide_35_60: { all: rsiW, oos: rsiWOos },
    },
    compareBasis: {
      regime: legOos.n >= 5 ? "oos" : "all",
      rsi: rsiNOos.n >= 5 ? "oos" : "all",
    },
    decisions: {
      adoptRegimeDeclineConfirm: adoptRegime,
      adoptRsiWide35_60: adoptRsiWide,
    },
  };

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2), "utf8");

  console.log("\n=== REGIME ===");
  console.log(
    `legacy all n=${legSum.n} sumNet=${legSum.sumNet.toFixed(3)} oos n=${legOos.n} sumNet=${legOos.sumNet.toFixed(3)}`,
  );
  console.log(
    `decline_confirm all n=${newSum.n} sumNet=${newSum.sumNet.toFixed(3)} oos n=${newOos.n} sumNet=${newOos.sumNet.toFixed(3)}`,
  );
  console.log(
    `compare=${report.compareBasis.regime} ADOPT decline_confirm: ${adoptRegime}`,
  );
  console.log("\n=== TREND_PULLBACK RSI ===");
  console.log(
    `40-55 all n=${rsiN.n} sumNet=${rsiN.sumNet.toFixed(3)} oos n=${rsiNOos.n} sumNet=${rsiNOos.sumNet.toFixed(3)}`,
  );
  console.log(
    `35-60 all n=${rsiW.n} sumNet=${rsiW.sumNet.toFixed(3)} oos n=${rsiWOos.n} sumNet=${rsiWOos.sumNet.toFixed(3)}`,
  );
  console.log(`compare=${report.compareBasis.rsi} ADOPT RSI 35-60: ${adoptRsiWide}`);
  console.log(`\nWrote ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
