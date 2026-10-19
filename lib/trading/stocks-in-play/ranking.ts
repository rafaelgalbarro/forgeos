import type { EodhdBar } from "@/lib/market-data/eodhd";
import type { StocksInPlayEntry } from "@/lib/trading/stocks-in-play/types";

export type RankCandidate = {
  row: {
    symbol: string;
    price: number;
    changePct: number;
    avgVolume: number;
    marketCap?: number;
    volume?: number;
  };
  rvol: number;
  relStrengthSpy: number;
  spreadPct?: number;
  reasonTags: string[];
};

export function estimateRvolSameTime(params: {
  dayVolume: number;
  avgDailyVolume: number;
  sessionElapsedFrac: number;
}): number {
  const frac = Math.max(0.05, Math.min(1, params.sessionElapsedFrac));
  const expected = params.avgDailyVolume * frac;
  if (!(expected > 0)) return 0;
  return params.dayVolume / expected;
}

export function usRegularSessionElapsedFrac(at: Date = new Date()): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? 0);
  const minute = Number(parts.find((p) => p.type === "minute")?.value ?? 0);
  const mins = hour * 60 + minute;
  const open = 9 * 60 + 30;
  const close = 16 * 60;
  if (mins < open) return 0.05;
  if (mins >= close) return 1;
  return (mins - open) / (close - open);
}

export function relativeStrengthVsBenchmark(
  symbolBars: readonly EodhdBar[],
  benchBars: readonly EodhdBar[],
  lookback = 20,
): number {
  if (symbolBars.length < lookback + 1 || benchBars.length < lookback + 1) return 0;
  const s0 = symbolBars[symbolBars.length - lookback - 1]?.close ?? 0;
  const s1 = symbolBars[symbolBars.length - 1]?.close ?? 0;
  const b0 = benchBars[benchBars.length - lookback - 1]?.close ?? 0;
  const b1 = benchBars[benchBars.length - 1]?.close ?? 0;
  if (!(s0 > 0 && s1 > 0 && b0 > 0 && b1 > 0)) return 0;
  return ((s1 - s0) / s0 - (b1 - b0) / b0) * 100;
}

export function isBreakout20dHigh(bars: readonly EodhdBar[], price: number): boolean {
  if (bars.length < 21 || !(price > 0)) return false;
  const prior = bars.slice(-21, -1);
  const hi = Math.max(...prior.map((b) => b.high));
  const lastVol = bars[bars.length - 1]?.volume ?? 0;
  const avgVol = prior.reduce((s, b) => s + (b.volume ?? 0), 0) / Math.max(1, prior.length);
  return price >= hi * 0.998 && lastVol >= avgVol * 1.2;
}

export function passesMomentumBand(changePct: number): boolean {
  return changePct >= 3 && changePct <= 20;
}

export function rankScore(c: RankCandidate): number {
  let score = Math.min(4, c.rvol) * 25;
  score += Math.min(20, Math.max(0, c.row.changePct)) * 2;
  score += Math.max(0, c.relStrengthSpy) * 1.5;
  if (c.reasonTags.includes("breakout_20d")) score += 15;
  if (c.spreadPct != null && c.spreadPct <= 0.15) score += 5;
  return score;
}

export function toInPlayEntry(c: RankCandidate): StocksInPlayEntry {
  return {
    symbol: c.row.symbol.trim().toUpperCase(),
    reason: c.reasonTags.join("; ") || "in-play",
    rankScore: rankScore(c),
    metrics: {
      price: c.row.price,
      changePct: c.row.changePct,
      rvol: c.rvol,
      relStrengthSpy: c.relStrengthSpy,
      spreadPct: c.spreadPct,
      marketCap: c.row.marketCap,
      avgVolume: c.row.avgVolume,
      dollarVol20d: c.row.avgVolume * c.row.price,
    },
  };
}
