import "server-only";

import type { NewsAggregate, PatternSnapshot } from "@/lib/market-data/types";
import { TRADING_CONFIG } from "./trading.config";
import { loadTradingState, updateTradingState, type MonitoredPosition } from "./trading-state-store";

export type AutoApprovalInput = {
  confidence: number;
  orderValueUSD: number;
  news?: NewsAggregate | null;
  patterns?: PatternSnapshot | null;
  rsi?: number | null;
  squeezeActive?: boolean;
  hasConflictingDivergence?: boolean;
};

export type AutoApprovalDecision =
  | { action: "AUTO_APPROVE"; reason: string }
  | { action: "NOTIFY_WAIT"; reason: string; waitMinutes: number }
  | { action: "HOLD"; reason: string };

function resetAutoCountIfNeeded(state: ReturnType<typeof loadTradingState>) {
  const today = new Date().toDateString();
  if (state.risk.autoApprovalLastResetDate !== today) {
    return { count: 0, date: today };
  }
  return { count: state.risk.autoApprovalDailyCount, date: state.risk.autoApprovalLastResetDate };
}

function hasHighConfidencePattern(patterns?: PatternSnapshot | null): boolean {
  if (!patterns) return false;
  const all = [...patterns.candlesticks, ...patterns.price];
  return all.some((p) => p.confidence >= 75);
}

function newsAligned(
  direction: "BUY" | "SELL",
  news?: NewsAggregate | null,
): boolean {
  if (!news) return false;
  if (direction === "BUY") return news.overallSentiment === "BULLISH";
  if (direction === "SELL") return news.overallSentiment === "BEARISH";
  return false;
}

function newsConflicting(
  direction: "BUY" | "SELL",
  news?: NewsAggregate | null,
): boolean {
  if (!news) return false;
  if (direction === "BUY" && news.overallSentiment === "BEARISH") return true;
  if (direction === "SELL" && news.overallSentiment === "BULLISH") return true;
  return false;
}

/** Evaluates semi-automatic approval rules from trading.config. */
export function evaluateAutoApproval(
  direction: "BUY" | "SELL",
  input: AutoApprovalInput,
): AutoApprovalDecision {
  const cfg = TRADING_CONFIG.autoApproval;
  if (!cfg.enabled) {
    return { action: "NOTIFY_WAIT", reason: "Auto-aprobación desactivada", waitMinutes: cfg.notifyAndWait.waitMinutes };
  }

  const state = loadTradingState();
  if (state.tradingPaused) {
    return { action: "HOLD", reason: "Trading automático pausado (/pause)" };
  }

  const { confidence, orderValueUSD, news, patterns, rsi, squeezeActive, hasConflictingDivergence } =
    input;

  if (confidence < cfg.alwaysHold.belowConfidence) {
    return { action: "HOLD", reason: `Confianza ${(confidence * 100).toFixed(0)}% < 72%` };
  }

  if (cfg.alwaysHold.newsConflicting && newsConflicting(direction, news)) {
    return { action: "HOLD", reason: "Noticias en conflicto con la dirección" };
  }

  if (cfg.alwaysHold.marketVolatilityHigh && squeezeActive) {
    // High vol squeeze = wait for confirmation unless very high confidence
    if (confidence < cfg.autoApproveThreshold.minConfidence) {
      return { action: "HOLD", reason: "Squeeze activo — esperar confirmación" };
    }
  }

  if (hasConflictingDivergence) {
    return { action: "HOLD", reason: "Divergencias contradictorias detectadas" };
  }

  const autoCfg = cfg.autoApproveThreshold;
  const { count: autoCount } = resetAutoCountIfNeeded(state);

  const patternOk = !autoCfg.requirePattern || hasHighConfidencePattern(patterns);
  const newsOk = !autoCfg.requireNewsSentiment || newsAligned(direction, news);

  if (
    confidence >= autoCfg.minConfidence &&
    orderValueUSD <= autoCfg.maxPositionValueUSD &&
    autoCount < autoCfg.maxDailyAutoTrades &&
    patternOk &&
    newsOk
  ) {
    return {
      action: "AUTO_APPROVE",
      reason: `Auto-aprobado: conf ${(confidence * 100).toFixed(0)}%, patrón=${patternOk}, news=${newsOk}, RSI=${rsi?.toFixed(0) ?? "N/A"}`,
    };
  }

  const [lo, hi] = cfg.notifyAndWait.confidenceRange;
  if (confidence >= lo && confidence < hi) {
    return {
      action: "NOTIFY_WAIT",
      reason: `Confianza en rango notify-wait (${(lo * 100).toFixed(0)}–${(hi * 100).toFixed(0)}%)`,
      waitMinutes: cfg.notifyAndWait.waitMinutes,
    };
  }

  if (confidence >= hi && (!patternOk || !newsOk)) {
    return {
      action: "NOTIFY_WAIT",
      reason: `Alta confianza pero falta ${!patternOk ? "patrón" : ""}${!patternOk && !newsOk ? " y " : ""}${!newsOk ? "sentimiento news" : ""}`,
      waitMinutes: cfg.notifyAndWait.waitMinutes,
    };
  }

  return { action: "HOLD", reason: "No cumple criterios de auto-aprobación ni notify-wait" };
}

export function incrementAutoApprovalCount(): void {
  updateTradingState((state) => {
    const today = new Date().toDateString();
    const reset = state.risk.autoApprovalLastResetDate !== today;
    return {
      ...state,
      risk: {
        ...state.risk,
        autoApprovalDailyCount: reset ? 1 : state.risk.autoApprovalDailyCount + 1,
        autoApprovalLastResetDate: today,
      },
    };
  });
}

export function addMonitoredPosition(position: MonitoredPosition): void {
  updateTradingState((state) => ({
    ...state,
    monitoredPositions: [
      position,
      ...state.monitoredPositions.filter((p) => p.ticker !== position.ticker),
    ].slice(0, 50),
  }));
}

export function removeMonitoredPosition(ticker: string): void {
  updateTradingState((state) => ({
    ...state,
    monitoredPositions: state.monitoredPositions.filter((p) => p.ticker !== ticker),
  }));
}
