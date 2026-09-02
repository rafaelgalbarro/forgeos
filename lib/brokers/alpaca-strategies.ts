/**
 * Alpaca forex + crypto signal engines (EMA trend / RSI / momentum / scalp).
 */

import "server-only";

import { computeEma, computeRsi } from "@/lib/investment/forex/indicators";
import { getRecentBars } from "@/lib/brokers/alpaca-client";
import { getAlpacaCryptoBars4h, getAlpacaCryptoMetrics, type AlpacaHistoryBar } from "@/lib/investment/alpaca/history";
import {
  alpacaAssetClass,
  normalizeAlpacaTicker,
} from "@/lib/brokers/alpaca-pairs";

export type AlpacaStrategyResult = {
  direction: "BUY" | "HOLD";
  confidence: number;
  reasoning: string;
  urgency: "LOW" | "MEDIUM" | "HIGH";
  primaryStrategy: string;
  stopLoss: number;
  takeProfit: number;
  rsi: number | null;
  strategyIds: string[];
};

const FOREX_STOP_PCT = 0.005;
const FOREX_TP_PCT = 0.015;
const CRYPTO_STOP_PCT = 0.02;
const CRYPTO_TP_PCT = 0.05;
const CRYPTO_MIN_CONFIDENCE = 0.65;

function slTpFromPct(price: number, stopPct: number, tpPct: number) {
  return {
    stopLoss: price * (1 - stopPct),
    takeProfit: price * (1 + tpPct),
  };
}

function evaluateForexSignals(closes: number[], price: number): AlpacaStrategyResult {
  const ema9 = computeEma(closes, 9);
  const ema21 = computeEma(closes, 21);
  const rsi = computeRsi(closes, 14);
  const reasons: string[] = [];
  let score = 0;

  if (ema9 != null && ema21 != null) {
    if (ema9 > ema21 && price >= ema9) {
      score += 0.42;
      reasons.push("EMA9>EMA21 trend alcista");
    } else if (ema9 < ema21) {
      return {
        direction: "HOLD",
        confidence: 0,
        reasoning: "EMA trend bajista — sin entrada long",
        urgency: "LOW",
        primaryStrategy: "ALPACA_FX_EMA",
        ...slTpFromPct(price, FOREX_STOP_PCT, FOREX_TP_PCT),
        rsi,
        strategyIds: [],
      };
    }
  }

  if (rsi != null) {
    if (rsi <= 35) {
      score += 0.38;
      reasons.push(`RSI oversold ${rsi.toFixed(0)}`);
    } else if (rsi >= 70) {
      return {
        direction: "HOLD",
        confidence: 0,
        reasoning: `RSI overbought ${rsi.toFixed(0)}`,
        urgency: "LOW",
        primaryStrategy: "ALPACA_FX_RSI",
        ...slTpFromPct(price, FOREX_STOP_PCT, FOREX_TP_PCT),
        rsi,
        strategyIds: [],
      };
    } else if (rsi >= 45 && rsi <= 60 && ema9 != null && ema21 != null && ema9 > ema21) {
      score += 0.15;
      reasons.push(`RSI neutral ${rsi.toFixed(0)} en tendencia`);
    }
  }

  const confidence = Math.min(0.92, score);
  const { stopLoss, takeProfit } = slTpFromPct(price, FOREX_STOP_PCT, FOREX_TP_PCT);
  if (confidence < 0.68) {
    return {
      direction: "HOLD",
      confidence,
      reasoning: reasons.length ? reasons.join(" · ") : "Sin confluencia forex Alpaca",
      urgency: "LOW",
      primaryStrategy: "ALPACA_FX",
      stopLoss,
      takeProfit,
      rsi,
      strategyIds: [],
    };
  }

  return {
    direction: "BUY",
    confidence,
    reasoning: reasons.join(" · "),
    urgency: confidence >= 0.8 ? "HIGH" : "MEDIUM",
    primaryStrategy: "ALPACA_FX_EMA_RSI",
    stopLoss,
    takeProfit,
    rsi,
    strategyIds: ["ALPACA_FX_EMA", "ALPACA_FX_RSI"],
  };
}

function evaluateCryptoSignals(
  closes: number[],
  price: number,
  change1hPct: number,
): AlpacaStrategyResult {
  const rsi = computeRsi(closes, 14);
  const reasons: string[] = [];
  let score = 0;

  if ((rsi != null && rsi < 40) || change1hPct > 0.3) {
    score += 0.45;
    reasons.push(
      `CRYPTO_SCALP RSI=${rsi?.toFixed(0) ?? "—"} Δ1h=${change1hPct.toFixed(2)}%`,
    );
  }

  if (closes.length >= 6) {
    const prev = closes[closes.length - 6]!;
    const momentumPct = ((price - prev) / prev) * 100;
    if (momentumPct >= 0.35) {
      score += 0.35;
      reasons.push(`Momentum +${momentumPct.toFixed(2)}% (5×4H)`);
    } else if (momentumPct <= -1.5) {
      return {
        direction: "HOLD",
        confidence: 0,
        reasoning: `Momentum débil ${momentumPct.toFixed(2)}%`,
        urgency: "LOW",
        primaryStrategy: "ALPACA_CRYPTO_MOM",
        ...slTpFromPct(price, CRYPTO_STOP_PCT, CRYPTO_TP_PCT),
        rsi,
        strategyIds: [],
      };
    }
  }

  if (rsi != null && rsi <= 38) {
    score += 0.25;
    reasons.push(`RSI oversold ${rsi.toFixed(0)}`);
  } else if (rsi != null && rsi >= 72) {
    return {
      direction: "HOLD",
      confidence: 0,
      reasoning: `RSI overbought ${rsi.toFixed(0)}`,
      urgency: "LOW",
      primaryStrategy: "ALPACA_CRYPTO_RSI",
      ...slTpFromPct(price, CRYPTO_STOP_PCT, CRYPTO_TP_PCT),
      rsi,
      strategyIds: [],
    };
  }

  const confidence = Math.min(0.9, score);
  const { stopLoss, takeProfit } = slTpFromPct(price, CRYPTO_STOP_PCT, CRYPTO_TP_PCT);
  if (confidence < CRYPTO_MIN_CONFIDENCE) {
    return {
      direction: "HOLD",
      confidence,
      reasoning: reasons.length ? reasons.join(" · ") : "Sin confluencia crypto Alpaca",
      urgency: "LOW",
      primaryStrategy: "ALPACA_CRYPTO",
      stopLoss,
      takeProfit,
      rsi,
      strategyIds: [],
    };
  }

  return {
    direction: "BUY",
    confidence,
    reasoning: reasons.join(" · "),
    urgency: confidence >= 0.82 ? "HIGH" : "MEDIUM",
    primaryStrategy: score >= 0.45 ? "ALPACA_CRYPTO_SCALP" : "ALPACA_CRYPTO_MOM_RSI",
    stopLoss,
    takeProfit,
    rsi,
    strategyIds: ["ALPACA_CRYPTO_SCALP", "ALPACA_CRYPTO_MOM", "ALPACA_CRYPTO_RSI"],
  };
}

export async function evaluateAlpacaStrategy(
  ticker: string,
  price: number,
): Promise<AlpacaStrategyResult> {
  const id = normalizeAlpacaTicker(ticker);
  const asset = alpacaAssetClass(id);

  let bars: AlpacaHistoryBar[] = [];
  const metrics = asset === "crypto" ? await getAlpacaCryptoMetrics(id).catch(() => null) : null;

  if (asset === "crypto") {
    bars = metrics?.bars4h ?? (await getAlpacaCryptoBars4h(id, 80).catch(() => []));
  } else if (asset === "forex") {
    bars = await getRecentBars(id, 40).catch(() => []);
  }

  const closes = bars.map((b) => b.close).filter((n: number) => Number.isFinite(n) && n > 0);

  if (closes.length < 10) {
    const stopPct = asset === "forex" ? FOREX_STOP_PCT : CRYPTO_STOP_PCT;
    const tpPct = asset === "forex" ? FOREX_TP_PCT : CRYPTO_TP_PCT;
    return {
      direction: "HOLD",
      confidence: 0,
      reasoning: `Historial insuficiente (${closes.length} barras)`,
      urgency: "LOW",
      primaryStrategy: "ALPACA_NO_DATA",
      ...slTpFromPct(price, stopPct, tpPct),
      rsi: null,
      strategyIds: [],
    };
  }

  if (asset === "forex") return evaluateForexSignals(closes, price);
  if (asset === "crypto") {
    return evaluateCryptoSignals(closes, price, metrics?.change1hPct ?? 0);
  }

  return {
    direction: "HOLD",
    confidence: 0,
    reasoning: "Ticker no Alpaca",
    urgency: "LOW",
    primaryStrategy: "ALPACA_UNKNOWN",
    stopLoss: price * 0.98,
    takeProfit: price * 1.02,
    rsi: null,
    strategyIds: [],
  };
}
