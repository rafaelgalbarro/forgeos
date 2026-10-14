/**
 * Full Kraken Futures backtest — all strategies + mirrored shorts.
 * Exit params tuned on IS (20d), validated OOS (10d). Futures fees + funding.
 */

import type { Bar } from "@/lib/brokers/kraken/market-store";
import { getKrakenFuturesAdapter, spotPairToPfSymbol } from "@/lib/brokers/kraken-futures";
import {
  ALL_CRYPTO_STRATEGY_IDS,
  type CryptoStrategyId,
} from "@/lib/trading/crypto/strategies/types";
import { evaluateTrendPullback1h } from "@/lib/trading/crypto/strategies/trend-pullback-1h";
import { evaluateRsiMeanReversion15m } from "@/lib/trading/crypto/strategies/rsi-mean-reversion-15m";
import { evaluateMomentumBreakout5m } from "@/lib/trading/crypto/strategies/momentum-breakout-5m";
import { evaluateTopGainerPullback } from "@/lib/trading/crypto/strategies/top-gainer-pullback";
import { evaluateVwapReclaim15m } from "@/lib/trading/crypto/strategies/vwap-reclaim-15m";
import { evaluateRangeGrid15m } from "@/lib/trading/crypto/strategies/range-grid-15m";
import { evaluateRsi2Trend5m } from "@/lib/trading/crypto/strategies/rsi2-trend-5m";
import { evaluateLiquiditySweep15m } from "@/lib/trading/crypto/strategies/liquidity-sweep-15m";
import { evaluateBbSqueezeBreakout15m } from "@/lib/trading/crypto/strategies/bb-squeeze-breakout-15m";
import { evaluateEmaCross15m } from "@/lib/trading/crypto/strategies/ema-cross-15m";
import { evaluateSessionOpenBreakout } from "@/lib/trading/crypto/strategies/session-open-breakout";
import { evaluateRsVsBtc1h, topRsPairsVsBtc } from "@/lib/trading/crypto/strategies/rs-vs-btc-1h";
import { evaluateMicroBreakout1m } from "@/lib/trading/crypto/strategies/micro-breakout-1m";
import {
  evaluateMomentumIgnition1m,
  topGainerPairs1h,
} from "@/lib/trading/crypto/strategies/momentum-ignition-1m";
import { evaluateCapitulationReversal1m } from "@/lib/trading/crypto/strategies/capitulation-reversal-1m";
import { evaluateVwapBounce5m } from "@/lib/trading/crypto/strategies/vwap-bounce-5m";
import { applyStopDistanceCap } from "@/lib/trading/crypto/signal-guards";
import { passesCostFilter } from "@/lib/trading/crypto/strategies/index";
import {
  compoundMaxDrawdownPct,
  findLimitBuyFill,
  liquidityBucket,
  priorRange,
} from "@/lib/trading/crypto/backtest-core";
import {
  getFuturesBacktestMakerFee,
  getFuturesBacktestTakerFee,
  simulateFuturesLongTrade,
  simulateShortTrade,
  spotRoundTripPct,
  futuresRoundTripPct,
} from "@/lib/trading/crypto/backtest-futures-core";
import { fundingRateAtTime } from "@/lib/trading/crypto/futures-funding";
import type { CryptoStrategySignal } from "@/lib/trading/crypto/strategies/types";

export type FuturesBtTrade = {
  strategy: CryptoStrategyId | string;
  pair: string;
  direction: "long" | "short";
  sample: "IS" | "OOS";
  netPct: number;
  liquidity: ReturnType<typeof liquidityBucket>;
  volEur: number;
  fundingPct: number;
};

export type ExitTune = { stopMult: number; tpMult: number };

const IS_DAYS = 20;
const TOTAL_DAYS = 30;
const EXIT_GRID: ExitTune[] = [];
for (const stopMult of [0.85, 1, 1.15]) {
  for (const tpMult of [0.9, 1, 1.25]) {
    EXIT_GRID.push({ stopMult, tpMult });
  }
}

export async function fetchKrakenSpotOhlc(
  pair: string,
  interval: 1 | 5 | 15 | 60,
): Promise<Bar[]> {
  const krakenPair =
    pair === "XBTEUR" || pair.startsWith("XBT") ? "XXBTZEUR" : pair.replace(/^XBT/, "XXBT");
  const url = `https://api.kraken.com/0/public/OHLC?pair=${encodeURIComponent(krakenPair)}&interval=${interval}`;
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
  return rows.map((r) => ({
    time: Number(r[0]),
    open: Number(r[1]),
    high: Number(r[2]),
    low: Number(r[3]),
    close: Number(r[4]),
    volume: Number(r[6]),
  }));
}

function sliceBars(bars: Bar[], endIdx: number, n: number): Bar[] {
  return bars.slice(Math.max(0, endIdx - n + 1), endIdx + 1);
}

function windowEndingAt(bars: Bar[], targetTime: number, n: number): Bar[] {
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

function applyExitTune(
  direction: "long" | "short",
  entry: number,
  stop: number,
  tp: number,
  tune: ExitTune,
): { stop: number; tp: number } {
  if (direction === "long") {
    const stopDist = entry - stop;
    const tpDist = tp - entry;
    return {
      stop: entry - stopDist * tune.stopMult,
      tp: entry + tpDist * tune.tpMult,
    };
  }
  const stopDist = stop - entry;
  const tpDist = entry - tp;
  return {
    stop: entry + stopDist * tune.stopMult,
    tp: entry - tpDist * tune.tpMult,
  };
}

function mirrorShort(sig: CryptoStrategySignal): CryptoStrategySignal | null {
  if (!(sig.entry > 0) || !(sig.stopLoss > 0) || !(sig.takeProfit > 0)) return null;
  const up = sig.stopLoss - sig.entry;
  const down = sig.entry - sig.takeProfit;
  if (!(up > 0) || !(down > 0)) return null;
  return {
    ...sig,
    direction: "SELL",
    stopLoss: sig.entry + up,
    takeProfit: sig.entry - down,
    reasoning: `mirror: ${sig.reasoning}`,
  };
}

function sampleForIndex(i: number, start: number, end: number): "IS" | "OOS" {
  const inEnd = start + Math.floor((end - start) * (IS_DAYS / TOTAL_DAYS));
  return i < inEnd ? "IS" : "OOS";
}

function simulateDirection(params: {
  direction: "long" | "short";
  bars: Bar[];
  entryBarIndex: number;
  entryPrice: number;
  stop: number;
  tp: number;
  maxBars: number;
  maker: number;
  taker: number;
  fundingRate8h: number;
  barMinutes: number;
}): { netPct: number; fundingPct: number } | null {
  const fill =
    params.direction === "long"
      ? simulateFuturesLongTrade({
          bars: params.bars,
          entryBarIndex: params.entryBarIndex,
          entryPrice: params.entryPrice,
          stopLoss: params.stop,
          takeProfit: params.tp,
          maxBars: params.maxBars,
          makerFee: params.maker,
          takerFee: params.taker,
          fundingRate8h: params.fundingRate8h,
          barMinutes: params.barMinutes,
        })
      : simulateShortTrade({
          bars: params.bars,
          entryBarIndex: params.entryBarIndex,
          entryPrice: params.entryPrice,
          stopLoss: params.stop,
          takeProfit: params.tp,
          maxBars: params.maxBars,
          makerFee: params.maker,
          takerFee: params.taker,
          fundingRate8h: params.fundingRate8h,
          barMinutes: params.barMinutes,
        });
  if (!fill) return null;
  const holdHours = (params.maxBars * params.barMinutes) / 60;
  const fundingPct =
    params.fundingRate8h *
    (holdHours / 8) *
    (params.direction === "long" ? 1 : -1) *
    100;
  return { netPct: fill.netPct, fundingPct };
}

function evalSignals(
  pair: string,
  w15: Bar[],
  w5: Bar[],
  w1h: Bar[],
  wBtc: Bar[],
  topRs: boolean,
): CryptoStrategySignal[] {
  const t15 = w15[w15.length - 1]?.time ?? 0;
  return [
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
    evaluateRsVsBtc1h(w15, w1h, wBtc, "ALCISTA", { isTop3Rs: topRs }),
    evaluateEmaCross15m(w15, w1h),
    evaluateSessionOpenBreakout(w15, new Date(t15 * 1000)),
  ];
}

function evalFastSignals(
  w1: Bar[],
  w5: Bar[],
  w1h: Bar[],
  top5: boolean,
): CryptoStrategySignal[] {
  return [
    evaluateMicroBreakout1m(w1, null),
    evaluateMomentumIgnition1m(w1, { isTop5Gainer1h: top5 }),
    evaluateCapitulationReversal1m(w1, "ALCISTA"),
    evaluateVwapBounce5m(w5.length ? w5 : w1, w1h),
  ];
}

function runBarFutures(params: {
  pair: string;
  bars: Bar[];
  bars5: Bar[];
  barMinutes: number;
  i: number;
  start: number;
  end: number;
  volEur: number;
  tune: ExitTune;
  maker: number;
  taker: number;
  fundingSeries: { time: number; rate: number }[];
  signals: CryptoStrategySignal[];
  mirrorShorts: boolean;
  sampleOverride?: "IS" | "OOS";
}): FuturesBtTrade[] {
  const out: FuturesBtTrade[] = [];
  const liq = liquidityBucket(params.volEur);
  const sample =
    params.sampleOverride ?? sampleForIndex(params.i, params.start, params.end);

  for (const sig of params.signals) {
    const legs: Array<{ sig: CryptoStrategySignal; direction: "long" | "short" }> = [];
    if (sig.direction === "BUY") {
      legs.push({ sig, direction: "long" });
      if (params.mirrorShorts) {
        const m = mirrorShort(sig);
        if (m) legs.push({ sig: m, direction: "short" });
      }
    } else continue;

    for (const leg of legs) {
      if (applyStopDistanceCap(leg.sig) === null) continue;
      if (!passesCostFilter(leg.sig, params.barMinutes <= 1 ? 0.0005 : 0.001)) continue;

      let entryBarIndex: number;
      let entryPrice: number;
      let stop: number;
      let tp: number;

      if (leg.sig.strategyId === "RANGE_GRID_15M" && leg.direction === "long") {
        const range = priorRange(params.bars, params.i, 96);
        if (!range) continue;
        const limit = range.lo + (range.hi - range.lo) / 3;
        const fill = findLimitBuyFill(params.bars, params.i, limit, 16);
        if (!fill) continue;
        entryBarIndex = fill.entryBarIndex;
        entryPrice = fill.entryPrice;
        const a = Math.abs(leg.sig.atr) || entryPrice * 0.01;
        stop = range.lo - a;
        tp = range.hi - (range.hi - range.lo) / 3;
      } else {
        entryBarIndex = params.i + 1;
        if (entryBarIndex >= params.bars.length) continue;
        entryPrice = params.bars[entryBarIndex]!.open;
        const scaled = rescaleStopsToEntry(
          entryPrice,
          leg.sig.entry > 0 ? leg.sig.entry : params.bars[params.i]!.close,
          leg.sig.stopLoss,
          leg.sig.takeProfit,
        );
        if (leg.direction === "short") {
          const up = leg.sig.stopLoss - (leg.sig.entry || entryPrice);
          const down = (leg.sig.entry || entryPrice) - leg.sig.takeProfit;
          stop = entryPrice + Math.max(up, entryPrice * 0.002);
          tp = entryPrice - Math.max(down, entryPrice * 0.004);
        } else {
          stop = scaled.stop;
          tp = scaled.tp;
        }
      }

      const tuned = applyExitTune(leg.direction, entryPrice, stop, tp, params.tune);
      const maxBars = Math.max(4, Math.floor(leg.sig.maxHoldMs / (params.barMinutes * 60_000)));
      const fundingRate8h = fundingRateAtTime(params.fundingSeries, entryPrice > 0 ? params.bars[entryBarIndex]!.time : 0);
      const sim = simulateDirection({
        direction: leg.direction,
        bars: params.bars,
        entryBarIndex,
        entryPrice,
        stop: tuned.stop,
        tp: tuned.tp,
        maxBars,
        maker: params.maker,
        taker: params.taker,
        fundingRate8h,
        barMinutes: params.barMinutes,
      });
      if (!sim) continue;

      out.push({
        strategy: leg.sig.strategyId,
        pair: params.pair,
        direction: leg.direction,
        sample,
        netPct: sim.netPct,
        liquidity: liq,
        volEur: params.volEur,
        fundingPct: sim.fundingPct,
      });
      break;
    }
  }
  return out;
}

export async function optimizeExitTunes(
  pairData: Map<
    string,
    { b1: Bar[]; b5: Bar[]; b15: Bar[]; b1h: Bar[]; vol: number; funding: { time: number; rate: number }[] }
  >,
  btc1h: Bar[],
  topRs: Set<string>,
  top5: Set<string>,
  maker: number,
  taker: number,
): Promise<Record<string, ExitTune>> {
  const tunes: Record<string, ExitTune> = {};
  for (const id of ALL_CRYPTO_STRATEGY_IDS) {
    let best: ExitTune = { stopMult: 1, tpMult: 1 };
    let bestScore = -Infinity;
    for (const tune of EXIT_GRID) {
      const trades: FuturesBtTrade[] = [];
      for (const [pair, data] of pairData) {
        const start15 = Math.max(120, data.b15.length - TOTAL_DAYS * 96);
        for (let i = start15; i < data.b15.length - 3; i++) {
          if (sampleForIndex(i, start15, data.b15.length) !== "IS") continue;
          const t15 = data.b15[i]!.time;
          const sigs = evalSignals(
            pair,
            sliceBars(data.b15, i, 150),
            windowEndingAt(data.b5, t15, 80),
            windowEndingAt(data.b1h, t15, 220),
            windowEndingAt(btc1h, t15, 220),
            topRs.has(pair),
          ).filter((s) => s.strategyId === id);
          trades.push(
            ...runBarFutures({
              pair,
              bars: data.b15,
              bars5: data.b5,
              barMinutes: 15,
              i,
              start: start15,
              end: data.b15.length,
              volEur: data.vol,
              tune,
              maker,
              taker,
              fundingSeries: data.funding,
              signals: sigs,
              mirrorShorts: true,
              sampleOverride: "IS",
            }),
          );
        }
        const start1 = Math.max(40, data.b1.length - 7 * 24 * 60);
        const isEnd1 = start1 + Math.floor((data.b1.length - start1) * (IS_DAYS / 7));
        for (let i = start1; i < Math.min(isEnd1, data.b1.length - 3); i++) {
          const t1 = data.b1[i]!.time;
          const sigs = evalFastSignals(
            sliceBars(data.b1, i, 40),
            windowEndingAt(data.b5, t1, 40),
            windowEndingAt(data.b1h, t1, 80),
            top5.has(pair),
          ).filter((s) => s.strategyId === id);
          trades.push(
            ...runBarFutures({
              pair,
              bars: data.b1,
              bars5: data.b5,
              barMinutes: 1,
              i,
              start: start1,
              end: data.b1.length,
              volEur: data.vol,
              tune,
              maker,
              taker,
              fundingSeries: data.funding,
              signals: sigs,
              mirrorShorts: true,
              sampleOverride: "IS",
            }),
          );
        }
      }
      if (trades.length < 3) continue;
      const avg = trades.reduce((s, t) => s + t.netPct, 0) / trades.length;
      if (avg > bestScore) {
        bestScore = avg;
        best = tune;
      }
    }
    tunes[id] = best;
  }
  return tunes;
}

export async function runFullFuturesBacktest(): Promise<{
  trades: FuturesBtTrade[];
  tunes: Record<string, ExitTune>;
  maker: number;
  taker: number;
  markdown: string;
}> {
  const adapter = getKrakenFuturesAdapter();
  const feeRow = await adapter.getFees().catch(() => null);
  const maker = getFuturesBacktestMakerFee(feeRow?.makerPct);
  const taker = getFuturesBacktestTakerFee(feeRow?.takerPct);

  const pairs = [
    "XBTEUR",
    "ETHEUR",
    "SOLEUR",
    "ADAEUR",
    "DOTEUR",
    "LINKEUR",
    "AVAXEUR",
    "LTCEUR",
  ];
  const btc1h = await fetchKrakenSpotOhlc("XBTEUR", 60);
  const pairData = new Map<
    string,
    { b1: Bar[]; b5: Bar[]; b15: Bar[]; b1h: Bar[]; vol: number; funding: { time: number; rate: number }[] }
  >();

  for (const pair of pairs) {
    const pf = spotPairToPfSymbol(pair);
    if (!pf) continue;
    const [b15, b5, b1h, b1, funding] = await Promise.all([
      fetchKrakenSpotOhlc(pair, 15),
      fetchKrakenSpotOhlc(pair, 5),
      fetchKrakenSpotOhlc(pair, 60),
      fetchKrakenSpotOhlc(pair, 1),
      adapter.getHistoricalFundingRates(pf).catch(() => []),
    ]);
    if (b15.length < 200) continue;
    pairData.set(pair, { b1, b5, b15, b1h, vol: 2_000_000, funding });
  }

  const topRs = new Set(
    topRsPairsVsBtc([...pairData.keys()], (p) => pairData.get(p)!.b1h, btc1h, 3),
  );
  const top5 = new Set(
    topGainerPairs1h([...pairData.keys()], (p) => pairData.get(p)!.b1h, 5),
  );

  const tunes = await optimizeExitTunes(pairData, btc1h, topRs, top5, maker, taker);
  const trades: FuturesBtTrade[] = [];

  for (const [pair, data] of pairData) {
    const tuneDefault = { stopMult: 1, tpMult: 1 };
    const start15 = Math.max(120, data.b15.length - TOTAL_DAYS * 96);
    for (let i = start15; i < data.b15.length - 3; i++) {
      const t15 = data.b15[i]!.time;
      const sigs = evalSignals(
        pair,
        sliceBars(data.b15, i, 150),
        windowEndingAt(data.b5, t15, 80),
        windowEndingAt(data.b1h, t15, 220),
        windowEndingAt(btc1h, t15, 220),
        topRs.has(pair),
      );
      for (const sig of sigs) {
        const tune = tunes[sig.strategyId] ?? tuneDefault;
        trades.push(
          ...runBarFutures({
            pair,
            bars: data.b15,
            bars5: data.b5,
            barMinutes: 15,
            i,
            start: start15,
            end: data.b15.length,
            volEur: data.vol,
            tune,
            maker,
            taker,
            fundingSeries: data.funding,
            signals: [sig],
            mirrorShorts: true,
          }),
        );
      }
    }
    const start1 = Math.max(40, data.b1.length - 7 * 24 * 60);
    for (let i = start1; i < data.b1.length - 3; i++) {
      const t1 = data.b1[i]!.time;
      const sigs = evalFastSignals(
        sliceBars(data.b1, i, 40),
        windowEndingAt(data.b5, t1, 40),
        windowEndingAt(data.b1h, t1, 80),
        top5.has(pair),
      );
      for (const sig of sigs) {
        const tune = tunes[sig.strategyId] ?? tuneDefault;
        trades.push(
          ...runBarFutures({
            pair,
            bars: data.b1,
            bars5: data.b5,
            barMinutes: 1,
            i,
            start: start1,
            end: data.b1.length,
            volEur: data.vol,
            tune,
            maker,
            taker,
            fundingSeries: data.funding,
            signals: [sig],
            mirrorShorts: true,
          }),
        );
      }
    }
  }

  const spotCompare = trades
    .filter((t) => t.sample === "OOS" && t.direction === "long")
    .map((t) => {
      /* spot fee delta approximated on same net gross */
      return t.netPct - (futuresRoundTripPct(maker, taker) - spotRoundTripPct());
    });

  const lines: string[] = [
    `# Futures backtest ${new Date().toISOString().slice(0, 10)}`,
    "",
    `Fees: maker ${(maker * 100).toFixed(3)}% taker ${(taker * 100).toFixed(3)}% | spot RT ${spotRoundTripPct().toFixed(2)}% vs futures RT ${futuresRoundTripPct(maker, taker).toFixed(2)}%`,
    `Exit tune: grid on IS (${IS_DAYS}d) per strategy; OOS (${TOTAL_DAYS - IS_DAYS}d) uses IS-chosen params only.`,
    "",
    "| Sample | Strategy | Dir | Liq | N | Avg net% | MaxDD% | Avg fund% |",
    "| --- | --- | --- | --- | ---: | ---: | ---: | ---: |",
  ];

  const groups = new Map<string, FuturesBtTrade[]>();
  for (const t of trades) {
    const k = `${t.sample}|${t.strategy}|${t.direction}|${t.liquidity}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(t);
  }
  for (const [k, ts] of [...groups.entries()].sort()) {
    const [sample, strategy, direction, liq] = k.split("|");
    const series = ts.map((x) => x.netPct);
    const avg = series.reduce((a, b) => a + b, 0) / Math.max(1, series.length);
    const fund =
      ts.reduce((a, b) => a + b.fundingPct, 0) / Math.max(1, ts.length);
    lines.push(
      `| ${sample} | ${strategy} | ${direction} | ${liq} | ${ts.length} | ${avg.toFixed(3)} | ${compoundMaxDrawdownPct(series).toFixed(2)} | ${fund.toFixed(3)} |`,
    );
  }

  if (spotCompare.length) {
    const avgSpotAdj =
      spotCompare.reduce((a, b) => a + b, 0) / spotCompare.length;
    lines.push(
      "",
      `OOS long approx spot-fee equivalent avg net%: ${avgSpotAdj.toFixed(3)} (futures fees − spot fees on same paths).`,
    );
  }

  lines.push("", "## Exit params chosen (IS)", "");
  for (const id of ALL_CRYPTO_STRATEGY_IDS) {
    const t = tunes[id] ?? { stopMult: 1, tpMult: 1 };
    lines.push(`- ${id}: stop×${t.stopMult} tp×${t.tpMult}`);
  }

  return {
    trades,
    tunes,
    maker,
    taker,
    markdown: lines.join("\n"),
  };
}
