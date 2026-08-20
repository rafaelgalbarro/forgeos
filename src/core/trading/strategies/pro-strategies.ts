/**
 * Professional strategies — screener-only (FMP profile / movers).
 * NO historical-price-eod (Starter plan → HTTP 402).
 */

import "server-only";

import { getQuote } from "@/lib/market-data/fmp";

export type ProStrategyId =
  | "GAP_AND_GO"
  | "MOMENTUM_BREAKOUT"
  | "NEAR_52W_HIGH"
  | "OVERSOLD_BOUNCE"
  | "VOLUME_SPIKE"
  | "MA_CROSSOVER";

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

export type ScreenerInputs = {
  price: number;
  change1dPct: number;
  volume: number;
  yearHigh?: number;
  yearLow?: number;
  priceAvg50?: number;
  priceAvg200?: number;
};

const BASE: Record<
  ProStrategyId,
  { name: string; base: number; sl: number; tp: number; style: ProStrategyHit["style"] }
> = {
  GAP_AND_GO: { name: "Gap & Go", base: 0.75, sl: 0.01, tp: 0.03, style: "scalping" },
  MOMENTUM_BREAKOUT: { name: "Momentum Breakout", base: 0.7, sl: 0.015, tp: 0.03, style: "scalping" },
  NEAR_52W_HIGH: { name: "Near 52w High", base: 0.73, sl: 0.02, tp: 0.05, style: "momentum" },
  OVERSOLD_BOUNCE: { name: "Oversold Bounce", base: 0.68, sl: 0.02, tp: 0.05, style: "swing" },
  VOLUME_SPIKE: { name: "Volume Spike", base: 0.65, sl: 0.015, tp: 0.04, style: "swing" },
  MA_CROSSOVER: { name: "MA Crossover", base: 0.67, sl: 0.02, tp: 0.04, style: "swing" },
};

function hit(
  id: ProStrategyId,
  reason: string,
): ProStrategyHit {
  const b = BASE[id];
  return {
    id,
    name: b.name,
    baseConfidence: b.base,
    reason,
    stopLossPct: b.sl,
    takeProfitPct: b.tp,
    style: b.style,
  };
}

/** Evaluate using screener/profile fields only — never fetches EOD history. */
export async function evaluateProStrategies(
  symbol: string,
  inputs?: Partial<ScreenerInputs>,
): Promise<ProStrategySignal> {
  const quote = await getQuote(symbol).catch(() => null);
  const price = inputs?.price ?? quote?.price ?? 0;
  const change1d =
    inputs?.change1dPct ?? quote?.changePercentage ?? 0;
  const volume = inputs?.volume ?? quote?.volume ?? 0;
  const yearHigh = inputs?.yearHigh ?? quote?.yearHigh ?? 0;
  const yearLow = inputs?.yearLow ?? quote?.yearLow ?? 0;
  const priceAvg50 = inputs?.priceAvg50 ?? quote?.priceAvg50 ?? 0;
  const priceAvg200 = inputs?.priceAvg200 ?? quote?.priceAvg200 ?? 0;

  const hold = (reason: string): ProStrategySignal => ({
    direction: "HOLD",
    confidence: 0,
    reasoning: reason,
    urgency: "LOW",
    strategyIds: [],
    primaryStrategy: "none",
    stopLossPct: 0.02,
    takeProfitPct: 0.04,
    stopLoss: 0,
    takeProfit: 0,
    rsi: null,
    metrics: {
      change1d,
      relVolume: 0,
      ema9: null,
      ema21: null,
      ema50: priceAvg50 > 0 ? priceAvg50 : null,
      vwapApprox: null,
      dist52wHigh: yearHigh > 0 && price > 0 ? price / yearHigh : null,
    },
  });

  if (!(price > 0)) {
    console.log(`[ProStrategy] ${symbol}: ninguna (sin precio screener)`);
    return hold("Sin precio screener");
  }

  const hits: ProStrategyHit[] = [];

  // 1. GAP_AND_GO
  if (change1d > 3 && volume > 1_000_000 && (priceAvg50 <= 0 || price > priceAvg50)) {
    hits.push(
      hit(
        "GAP_AND_GO",
        `Gap +${change1d.toFixed(1)}% vol=${(volume / 1e6).toFixed(1)}M` +
          (priceAvg50 > 0 ? ` >MA50` : ""),
      ),
    );
  }

  // 2. MOMENTUM_BREAKOUT
  if (change1d > 2 && volume > 500_000 && (priceAvg50 <= 0 || price > priceAvg50)) {
    hits.push(
      hit(
        "MOMENTUM_BREAKOUT",
        `Mom +${change1d.toFixed(1)}% vol=${(volume / 1e3).toFixed(0)}k` +
          (priceAvg50 > 0 ? ` >MA50` : ""),
      ),
    );
  }

  // 3. NEAR_52W_HIGH
  if (yearHigh > 0 && price > yearHigh * 0.95 && change1d > 0) {
    hits.push(
      hit(
        "NEAR_52W_HIGH",
        `Precio $${price.toFixed(2)} a ${((price / yearHigh) * 100).toFixed(0)}% del high $${yearHigh.toFixed(2)}`,
      ),
    );
  }

  // 4. OVERSOLD_BOUNCE
  if (yearLow > 0 && price < yearLow * 1.15 && change1d > 1) {
    hits.push(
      hit(
        "OVERSOLD_BOUNCE",
        `Cerca low52 $${yearLow.toFixed(2)} + rebote ${change1d.toFixed(1)}%`,
      ),
    );
  }

  // 5. VOLUME_SPIKE
  if (volume > 2_000_000 && Math.abs(change1d) > 2) {
    hits.push(
      hit(
        "VOLUME_SPIKE",
        `Vol spike ${(volume / 1e6).toFixed(1)}M Δ${change1d.toFixed(1)}%`,
      ),
    );
  }

  // 6. MA_CROSSOVER
  if (
    priceAvg50 > 0 &&
    priceAvg200 > 0 &&
    price > priceAvg50 &&
    priceAvg50 > priceAvg200 &&
    change1d > 0
  ) {
    hits.push(
      hit(
        "MA_CROSSOVER",
        `Price>MA50>MA200 ($${priceAvg50.toFixed(2)}>$${priceAvg200.toFixed(2)})`,
      ),
    );
  }

  if (hits.length === 0) {
    console.log(`[ProStrategy] ${symbol}: ninguna señal screener`);
    return hold("Ninguna estrategia screener");
  }

  hits.sort((a, b) => b.baseConfidence - a.baseConfidence);
  const primary = hits[0]!;
  const boost = hits.length >= 3 ? 0.15 : hits.length === 2 ? 0.08 : 0;
  const confidence = Math.min(0.92, primary.baseConfidence + boost);
  const names = hits.map((h) => h.name).join(" + ");

  console.log(
    `[ProStrategy] ${symbol}: ${primary.id} conf=${(confidence * 100).toFixed(0)}% BUY` +
      (hits.length > 1 ? ` (+${hits.length - 1} más)` : ""),
  );

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
    rsi: null,
    metrics: {
      change1d,
      relVolume: 0,
      ema9: null,
      ema21: null,
      ema50: priceAvg50 > 0 ? priceAvg50 : null,
      vwapApprox: null,
      dist52wHigh: yearHigh > 0 ? price / yearHigh : null,
    },
  };
}

/** Regional focus ETFs by Madrid hour (lightweight cycle bias, not a fixed stock list). */
export function regionalFocusTickersMadrid(): string[] {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Madrid",
    hour: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const hh = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  if (hh >= 9 && hh < 16) return ["SPY", "QQQ", "IWM"];
  if (hh >= 16 && hh < 22) return ["SPY", "QQQ", "XLK"];
  return ["SPY", "QQQ", "GLD"];
}
