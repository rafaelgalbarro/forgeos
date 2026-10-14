/**
 * Kraken Futures backtest — long/short, fees+funding, IS 20d / OOS 10d exit tuning.
 *
 *   npx tsx --require ./scripts/stub-server-only.cjs scripts/futures-backtest.ts
 */

import fs from "node:fs";
import path from "node:path";
import { getKrakenFuturesAdapter, spotPairToPfSymbol } from "../lib/brokers/kraken-futures";
import {
  futuresRoundTripPct,
  getFuturesBacktestMakerFee,
  getFuturesBacktestTakerFee,
  simulateShortTrade,
} from "../lib/trading/crypto/backtest-futures-core";
import {
  compoundMaxDrawdownPct,
  simulateLongTrade,
  spotRoundTripPct,
} from "../lib/trading/crypto/backtest-core";
import type { Bar } from "../lib/brokers/kraken/market-store";

const ROOT = process.env.FORGEOS_ROOT?.trim() || path.resolve(__dirname, "..");
const PAIRS = ["XBTEUR", "ETHEUR", "SOLEUR", "ADAEUR", "LINKEUR"];
const IS_DAYS = 20;
const OOS_DAYS = 10;

type Row = {
  pair: string;
  direction: "long" | "short";
  sample: "IS" | "OOS";
  netPct: number;
  liquidity: string;
};

function liquidityBucket(vol: number): string {
  if (vol >= 5_000_000) return "high";
  if (vol >= 1_000_000) return "mid";
  return "low";
}

function splitBars(bars: Bar[]): { is: Bar[]; oos: Bar[] } {
  const dayBars = 24 * 60 / 15;
  const isLen = Math.floor(IS_DAYS * dayBars);
  const oosLen = Math.floor(OOS_DAYS * dayBars);
  if (bars.length < isLen + oosLen + 50) {
    const cut = Math.floor(bars.length * 0.67);
    return { is: bars.slice(0, cut), oos: bars.slice(cut) };
  }
  return {
    is: bars.slice(0, isLen),
    oos: bars.slice(isLen, isLen + oosLen),
  };
}

async function fetchFutures15m(pf: string): Promise<Bar[]> {
  const adapter = getKrakenFuturesAdapter();
  const from = Date.now() - (IS_DAYS + OOS_DAYS + 5) * 86400_000;
  const raw = await adapter.getCandles(pf, 15, from);
  return raw.map((b) => ({
    time: b.time,
    open: b.open,
    high: b.high,
    low: b.low,
    close: b.close,
    volume: b.volume,
  }));
}

function runLongShortOnSlice(bars: Bar[], sample: "IS" | "OOS", pair: string): Row[] {
  const out: Row[] = [];
  const vol = bars.reduce((s, b) => s + b.volume, 0);
  const liq = liquidityBucket(vol);
  for (let i = 40; i < bars.length - 5; i += 6) {
    const entry = bars[i]!.close;
    const stop = entry * 0.985;
    const tp = entry * 1.02;
    const longFill = simulateLongTrade({
      bars,
      entryBarIndex: i,
      entryPrice: entry,
      stopLoss: stop,
      takeProfit: tp,
      maxBars: 24,
    });
    if (longFill) {
      out.push({ pair, direction: "long", sample, netPct: longFill.netPct, liquidity: liq });
    }
    const shortFill = simulateShortTrade({
      bars,
      entryBarIndex: i,
      entryPrice: entry,
      stopLoss: entry * 1.015,
      takeProfit: entry * 0.98,
      maxBars: 24,
      makerFee: getFuturesBacktestMakerFee(),
      takerFee: getFuturesBacktestTakerFee(),
    });
    if (shortFill) {
      out.push({ pair, direction: "short", sample, netPct: shortFill.netPct, liquidity: liq });
    }
  }
  return out;
}

async function main(): Promise<void> {
  const adapter = getKrakenFuturesAdapter();
  const fees = await adapter.getFees().catch(() => null);
  const maker = fees?.makerPct;
  const taker = fees?.takerPct;
  console.log(
    `[FuturesBT] fees maker=${(getFuturesBacktestMakerFee(maker) * 100).toFixed(3)}% taker=${(getFuturesBacktestTakerFee(taker) * 100).toFixed(3)}%`,
  );
  console.log(
    `[FuturesBT] round-trip spot≈${spotRoundTripPct().toFixed(2)}% futures≈${futuresRoundTripPct(maker, taker).toFixed(2)}%`,
  );

  const rows: Row[] = [];
  for (const spot of PAIRS) {
    const pf = spotPairToPfSymbol(spot);
    if (!pf) continue;
    const bars = await fetchFutures15m(pf);
    if (bars.length < 200) {
      console.warn(`[FuturesBT] skip ${pf} bars=${bars.length}`);
      continue;
    }
    const { is, oos } = splitBars(bars);
    rows.push(...runLongShortOnSlice(is, "IS", spot));
    rows.push(...runLongShortOnSlice(oos, "OOS", spot));
  }

  const reportDir = path.join(ROOT, ".forgeos", "reports");
  fs.mkdirSync(reportDir, { recursive: true });
  const date = new Date().toISOString().slice(0, 10);
  const lines = [
    `# Futures backtest ${date}`,
    "",
    `IS=${IS_DAYS}d OOS=${OOS_DAYS}d (exit params tuned on IS only in full engine; here fixed 1.5%/2%)`,
    "",
    "| sample | direction | n | avg net% | maxDD% |",
    "| --- | --- | ---: | ---: | ---: |",
  ];

  for (const sample of ["IS", "OOS"] as const) {
    for (const direction of ["long", "short"] as const) {
      const subset = rows.filter((r) => r.sample === sample && r.direction === direction);
      const series = subset.map((r) => r.netPct);
      const avg = series.length ? series.reduce((a, b) => a + b, 0) / series.length : 0;
      const dd = compoundMaxDrawdownPct(series);
      lines.push(`| ${sample} | ${direction} | ${series.length} | ${avg.toFixed(3)} | ${dd.toFixed(2)} |`);
    }
  }

  lines.push("", "## By liquidity (OOS long)", "");
  for (const liq of ["high", "mid", "low"]) {
    const subset = rows.filter((r) => r.sample === "OOS" && r.direction === "long" && r.liquidity === liq);
    const avg = subset.length
      ? subset.reduce((s, r) => s + r.netPct, 0) / subset.length
      : 0;
    lines.push(`- ${liq}: n=${subset.length} avg=${avg.toFixed(3)}%`);
  }

  const outFile = path.join(reportDir, `futures-backtest-${date}.md`);
  fs.writeFileSync(outFile, lines.join("\n"), "utf8");
  console.log(`[FuturesBT] wrote ${outFile} trades=${rows.length}`);
}

main().catch((err) => {
  console.error("[FuturesBT]", err instanceof Error ? err.message : err);
  process.exit(1);
});
