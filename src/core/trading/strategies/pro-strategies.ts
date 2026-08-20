/**
 * Professional intraday strategies — signal engine (no PatternRecognition / Sentiment).
 * Uses FMP EOD history + live quote. BUY-only for long scalping/swing.
 */

import "server-only";

import { getHistory, getQuote, type FmpBar } from "@/lib/market-data/fmp";
import { ema, rsi } from "@/lib/market-data/technical-indicators";

export type ProStrategyId =
  | "MOMENTUM_BREAKOUT"
  | "VWAP_BOUNCE"
  | "RSI_OVERSOLD_BOUNCE"
  | "GAP_AND_GO"
  | "VOLUME_SPIKE_REVERSAL"
  | "MA_CROSSOVER"
  | "NEAR_52W_HIGH"
  | "EARNINGS_MOMENTUM";

export type ProStrategyHit = {
  id: ProStrategyId;
  name: string;
  baseConfidence: number;
  reason: string;
  stopLossPct: number;
  takeProfitPct: number;
  style: "scalping" | "swing" | "momentum";
};

export type ProStrategySignal = {
  direction: "BUY" | "HOLD";
  confidence: number;
  reasoning: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  strategyIds: ProStrategyId[];
  primaryStrategy: string;
  stopLossPct: number;
  takeProfitPct: number;
  stopLoss: number;
  takeProfit: number;
  rsi: number | null;
  metrics: {
    change1d: number;
    relVolume: number;
    ema9: number | null;
    ema21: number | null;
    ema50: number | null;
    vwapApprox: number | null;
    dist52wHigh: number | null;
  };
};

const BASE: Record<
  ProStrategyId,
  { name: string; base: number; sl: number; tp: number; style: ProStrategyHit["style"] }
> = {
  MOMENTUM_BREAKOUT: { name: "Momentum Breakout", base: 0.7, sl: 0.015, tp: 0.03, style: "scalping" },
  VWAP_BOUNCE: { name: "VWAP Bounce", base: 0.68, sl: 0.015, tp: 0.03, style: "scalping" },
  RSI_OVERSOLD_BOUNCE: { name: "RSI Oversold Bounce", base: 0.72, sl: 0.02, tp: 0.05, style: "swing" },
  GAP_AND_GO: { name: "Gap & Go", base: 0.75, sl: 0.01, tp: 0.04, style: "scalping" },
  VOLUME_SPIKE_REVERSAL: { name: "Volume Spike Reversal", base: 0.65, sl: 0.02, tp: 0.04, style: "swing" },
  MA_CROSSOVER: { name: "MA Crossover", base: 0.67, sl: 0.02, tp: 0.04, style: "swing" },
  NEAR_52W_HIGH: { name: "Near 52w High", base: 0.73, sl: 0.02, tp: 0.05, style: "momentum" },
  EARNINGS_MOMENTUM: { name: "Earnings Momentum", base: 0.8, sl: 0.02, tp: 0.06, style: "momentum" },
};

function closes(bars: FmpBar[]): number[] {
  return bars.map((b) => b.close).filter((n) => Number.isFinite(n) && n > 0);
}

function avgVolume(bars: FmpBar[], n: number): number {
  const slice = bars.slice(-n);
  if (slice.length === 0) return 0;
  return slice.reduce((s, b) => s + (b.volume || 0), 0) / slice.length;
}

function isHammerOrDoji(bar: FmpBar): boolean {
  const body = Math.abs(bar.close - bar.open);
  const range = Math.max(bar.high - bar.low, 1e-9);
  const lower = Math.min(bar.open, bar.close) - bar.low;
  const upper = bar.high - Math.max(bar.open, bar.close);
  const doji = body / range < 0.12;
  const hammer = lower >= body * 2 && upper <= body * 0.5 && body / range < 0.4;
  return doji || hammer;
}

function vwapApprox(bar: FmpBar): number {
  return (bar.high + bar.low + bar.close) / 3;
}

async function recentEarningsBeat(symbol: string): Promise<boolean> {
  const key = process.env.FMP_API_KEY?.trim();
  if (!key) return false;
  const to = new Date();
  const from = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  try {
    const url = new URL("https://financialmodelingprep.com/stable/earning-calendar-confirmed");
    url.searchParams.set("from", fmt(from));
    url.searchParams.set("to", fmt(to));
    url.searchParams.set("apikey", key);
    const res = await fetch(url.toString(), { cache: "no-store", signal: AbortSignal.timeout(12_000) });
    if (!res.ok) return false;
    const body = (await res.json()) as Array<{ symbol?: string; epsEstimated?: number; eps?: number }>;
    if (!Array.isArray(body)) return false;
    const row = body.find((r) => String(r.symbol ?? "").toUpperCase() === symbol);
    if (!row) return false;
    const est = Number(row.epsEstimated);
    const act = Number(row.eps);
    if (!Number.isFinite(est) || !Number.isFinite(act)) return true; // calendar hit without EPS → treat as event
    return act >= est;
  } catch {
    return false;
  }
}

export async function evaluateProStrategies(ticker: string): Promise<ProStrategySignal> {
  const symbol = ticker.trim().toUpperCase();
  const [quote, hist] = await Promise.all([
    getQuote(symbol),
    getHistory(symbol, 90),
  ]);

  const price = quote?.price ?? hist.at(-1)?.close ?? 0;
  if (!(price > 0) || hist.length < 25) {
    return {
      direction: "HOLD",
      confidence: 0,
      reasoning: "Datos insuficientes para estrategias",
      urgency: "LOW",
      strategyIds: [],
      primaryStrategy: "NONE",
      stopLossPct: 0.015,
      takeProfitPct: 0.03,
      stopLoss: price,
      takeProfit: price,
      rsi: null,
      metrics: {
        change1d: 0,
        relVolume: 0,
        ema9: null,
        ema21: null,
        ema50: null,
        vwapApprox: null,
        dist52wHigh: null,
      },
    };
  }

  const c = closes(hist);
  const last = hist[hist.length - 1]!;
  const prev = hist[hist.length - 2] ?? last;
  const vol20 = avgVolume(hist.slice(0, -1), 20);
  const volToday = quote?.volume ?? last.volume ?? 0;
  const relVolume = vol20 > 0 ? volToday / vol20 : 1;
  const change1d = quote?.changePercentage ?? ((price - prev.close) / prev.close) * 100;
  const rsi14 = rsi(c, 14);
  const ema9 = ema(c, 9);
  const ema21 = ema(c, 21);
  const ema50 = ema(c, 50);
  // Prior bar EMA for crossover detection
  const ema9Prev = ema(c.slice(0, -1), 9);
  const ema21Prev = ema(c.slice(0, -1), 21);
  const high20 = Math.max(...hist.slice(-21, -1).map((b) => b.high));
  const low5 = Math.min(...hist.slice(-5).map((b) => b.low));
  const yearHigh = quote?.yearHigh ?? Math.max(...hist.map((b) => b.high));
  const dist52w = yearHigh > 0 ? price / yearHigh : 0;
  const vwap = vwapApprox(last);
  const gapPct = prev.close > 0 ? ((last.open - prev.close) / prev.close) * 100 : 0;
  const gapHeld = price >= last.open * 0.995;
  const drop2d =
    hist.length >= 3
      ? ((price - hist[hist.length - 3]!.close) / hist[hist.length - 3]!.close) * 100
      : change1d;
  const volGrowing3d =
    hist.length >= 4 &&
    hist[hist.length - 1]!.volume > hist[hist.length - 2]!.volume &&
    hist[hist.length - 2]!.volume > hist[hist.length - 3]!.volume;

  const hits: ProStrategyHit[] = [];

  // 1. MOMENTUM BREAKOUT
  if (price > high20 && relVolume >= 2 && change1d > 2) {
    const b = BASE.MOMENTUM_BREAKOUT;
    hits.push({
      id: "MOMENTUM_BREAKOUT",
      name: b.name,
      baseConfidence: b.base,
      reason: "Ruptura de resistencia con volumen fuerte",
      stopLossPct: b.sl,
      takeProfitPct: b.tp,
      style: b.style,
    });
  }

  // 2. VWAP BOUNCE
  if (
    vwap > 0 &&
    Math.abs(price - vwap) / vwap <= 0.003 &&
    rsi14 != null &&
    rsi14 >= 40 &&
    rsi14 <= 60 &&
    relVolume >= 1.2
  ) {
    const b = BASE.VWAP_BOUNCE;
    hits.push({
      id: "VWAP_BOUNCE",
      name: b.name,
      baseConfidence: b.base,
      reason: "Rebote en VWAP con momentum",
      stopLossPct: b.sl,
      takeProfitPct: b.tp,
      style: b.style,
    });
  }

  // 3. RSI OVERSOLD BOUNCE
  if (rsi14 != null && rsi14 < 30 && price <= low5 * 1.01 && isHammerOrDoji(last)) {
    const b = BASE.RSI_OVERSOLD_BOUNCE;
    hits.push({
      id: "RSI_OVERSOLD_BOUNCE",
      name: b.name,
      baseConfidence: b.base,
      reason: "RSI oversold + soporte clave",
      stopLossPct: b.sl,
      takeProfitPct: b.tp,
      style: b.style,
    });
  }

  // 4. GAP AND GO
  if (gapPct > 2 && relVolume >= 3 && gapHeld && change1d > 0) {
    const b = BASE.GAP_AND_GO;
    hits.push({
      id: "GAP_AND_GO",
      name: b.name,
      baseConfidence: b.base,
      reason: "Gap alcista con volumen institucional",
      stopLossPct: b.sl,
      takeProfitPct: b.tp,
      style: b.style,
    });
  }

  // 5. VOLUME SPIKE REVERSAL
  if (relVolume >= 5 && drop2d <= -3 && rsi14 != null && rsi14 < 35) {
    const b = BASE.VOLUME_SPIKE_REVERSAL;
    hits.push({
      id: "VOLUME_SPIKE_REVERSAL",
      name: b.name,
      baseConfidence: b.base,
      reason: "Agotamiento vendedor con volumen extremo",
      stopLossPct: b.sl,
      takeProfitPct: b.tp,
      style: b.style,
    });
  }

  // 6. MA CROSSOVER
  if (
    ema9 != null &&
    ema21 != null &&
    ema50 != null &&
    ema9Prev != null &&
    ema21Prev != null &&
    ema9Prev <= ema21Prev &&
    ema9 > ema21 &&
    price > ema50 &&
    relVolume >= 1.1
  ) {
    const b = BASE.MA_CROSSOVER;
    hits.push({
      id: "MA_CROSSOVER",
      name: b.name,
      baseConfidence: b.base,
      reason: "Cruce alcista EMAs con tendencia positiva",
      stopLossPct: b.sl,
      takeProfitPct: b.tp,
      style: b.style,
    });
  }

  // 7. NEAR 52W HIGH
  if (dist52w >= 0.95 && (volGrowing3d || relVolume >= 1.5) && change1d > 0) {
    const b = BASE.NEAR_52W_HIGH;
    hits.push({
      id: "NEAR_52W_HIGH",
      name: b.name,
      baseConfidence: b.base,
      reason: "Momentum máximos históricos",
      stopLossPct: b.sl,
      takeProfitPct: b.tp,
      style: b.style,
    });
  }

  // 8. EARNINGS MOMENTUM
  const earningsBeat = await recentEarningsBeat(symbol);
  if (earningsBeat && change1d > 5 && relVolume >= 1.5) {
    const b = BASE.EARNINGS_MOMENTUM;
    hits.push({
      id: "EARNINGS_MOMENTUM",
      name: b.name,
      baseConfidence: b.base,
      reason: "Post-earnings momentum sostenido",
      stopLossPct: b.sl,
      takeProfitPct: b.tp,
      style: b.style,
    });
  }

  if (hits.length === 0) {
    return {
      direction: "HOLD",
      confidence: 0,
      reasoning: "Ninguna estrategia profesional activa",
      urgency: "LOW",
      strategyIds: [],
      primaryStrategy: "NONE",
      stopLossPct: 0.015,
      takeProfitPct: 0.03,
      stopLoss: price * 0.985,
      takeProfit: price * 1.03,
      rsi: rsi14,
      metrics: {
        change1d,
        relVolume,
        ema9,
        ema21,
        ema50,
        vwapApprox: vwap,
        dist52wHigh: dist52w,
      },
    };
  }

  hits.sort((a, b) => b.baseConfidence - a.baseConfidence);
  const primary = hits[0]!;
  const confidence = Math.min(0.92, primary.baseConfidence + Math.max(0, hits.length - 1) * 0.08);
  const names = hits.map((h) => h.name).join(" + ");

  return {
    direction: "BUY",
    confidence: Number(confidence.toFixed(3)),
    reasoning: `${primary.reason} [${names}]`,
    urgency: confidence >= 0.8 ? "HIGH" : confidence >= 0.7 ? "MEDIUM" : "LOW",
    strategyIds: hits.map((h) => h.id),
    primaryStrategy: primary.name,
    stopLossPct: primary.stopLossPct,
    takeProfitPct: primary.takeProfitPct,
    stopLoss: Number((price * (1 - primary.stopLossPct)).toFixed(4)),
    takeProfit: Number((price * (1 + primary.takeProfitPct)).toFixed(4)),
    rsi: rsi14,
    metrics: {
      change1d,
      relVolume,
      ema9,
      ema21,
      ema50,
      vwapApprox: vwap,
      dist52wHigh: dist52w,
    },
  };
}

/** Regional focus tickers by Madrid hour for 24h coverage. */
export function regionalFocusTickersMadrid(): string[] {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  if (hh >= 0 && hh < 9) return ["EWJ", "FXI", "EWA", "EWY"];
  if (hh >= 9 && hh < 15) return ["EZU", "VGK", "EWG", "EWU"];
  if (hh >= 22 || hh < 2) return ["IBIT", "FETH", "GLD", "USO"];
  return [];
}
