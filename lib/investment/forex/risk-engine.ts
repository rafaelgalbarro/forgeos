/**
 * FOREX risk gates — 1% NAV/trade, 3% daily NAV stop, max 3 pairs, news blackout.
 */

import "server-only";

import {
  FOREX_MAX_UNITS,
  FOREX_RISK_POLICY,
  clampForexUnits,
  loadForexEnvConfig,
  positionUnitsForRisk,
  type ForexIbkrContract,
} from "@/lib/investment/forex/config";
import { TRADING_CONFIG } from "@/src/core/trading/trading.config";
import { FOREX_DAILY_GOALS, canOpenForexTrade, getForexDailyState } from "@/lib/investment/forex/goals";
import type { ForexStrategyStyle } from "@/lib/investment/forex/strategies/defs";
import type { ForexStrategySignal } from "@/lib/investment/forex/strategies/engine";

export type ForexRiskDecision = {
  allowed: boolean;
  reason?: string;
  units?: number;
  riskPct: number;
  riskAmount?: number;
};

export function assessForexRisk(params: {
  signal: ForexStrategySignal;
  pair: ForexIbkrContract;
  nav: number;
  cash: number;
  openPairCount: number;
  blackoutActive: boolean;
  tradingWindowActive: boolean;
  strategyWindowActive: boolean;
}): ForexRiskDecision {
  const riskPct = TRADING_CONFIG.risk.forex.riskPctNav;
  const minCashUSD = TRADING_CONFIG.risk.forex.minCashUSD;
  const config = loadForexEnvConfig();
  const daily = getForexDailyState();

  if (!Number.isFinite(params.cash) || params.cash < minCashUSD) {
    return {
      allowed: false,
      reason: `Cash insuficiente para FOREX (mín €${minCashUSD}, actual €${Number.isFinite(params.cash) ? params.cash.toFixed(0) : "NO_DATA"})`,
      riskPct,
    };
  }

  if (!params.tradingWindowActive) {
    return { allowed: false, reason: "Fuera de horario — solo análisis", riskPct };
  }
  if (!params.strategyWindowActive) {
    return { allowed: false, reason: "Estrategia fuera de su ventana horaria", riskPct };
  }
  if (params.blackoutActive) {
    return { allowed: false, reason: "Blackout noticias HIGH (±30m)", riskPct };
  }
  if (daily.stoppedOut) {
    return { allowed: false, reason: "Stop diario activo", riskPct };
  }
  // Approx NAV daily stop: if realized pips strongly negative, already gated; also % of NAV loss estimate
  const roughLossPct = Math.abs(Math.min(0, daily.realizedPips)) * 0.01; // rough
  if (roughLossPct >= FOREX_DAILY_GOALS.dailyNavStopPct) {
    return { allowed: false, reason: "Stop diario 3% NAV", riskPct };
  }

  const tradeGate = canOpenForexTrade(params.signal.style);
  if (!tradeGate.ok) return { allowed: false, reason: tradeGate.reason, riskPct };

  if (params.openPairCount >= FOREX_DAILY_GOALS.maxConcurrentPairs) {
    return { allowed: false, reason: `Máx ${FOREX_DAILY_GOALS.maxConcurrentPairs} pares simultáneos`, riskPct };
  }

  const sized = positionUnitsForRisk({
    nav: Number.isFinite(params.nav) && params.nav > 0 ? params.nav : params.cash,
    riskPct,
    stopPips: params.signal.stopPips > 0 ? params.signal.stopPips : TRADING_CONFIG.risk.forex.defaultStopPips,
    pair: params.pair,
    midPrice: params.signal.entry,
    minUnits: Math.max(config.minUnits, TRADING_CONFIG.risk.forex.minUnits),
    maxUnits: Math.min(
      config.maxUnits,
      TRADING_CONFIG.risk.forex.maxUnits ?? FOREX_MAX_UNITS,
      FOREX_MAX_UNITS,
    ),
  });
  if (!sized) return { allowed: false, reason: "No se pudo calcular tamaño", riskPct };

  // Cap risk to policy
  if (riskPct > FOREX_RISK_POLICY.maxRiskPctNav) {
    return { allowed: false, reason: "Risk % > política", riskPct };
  }

  return {
    allowed: true,
    units: clampForexUnits(sized.units),
    riskPct,
    riskAmount: sized.riskAmount,
  };
}

export function styleFromSignal(style: ForexStrategyStyle): ForexStrategyStyle {
  return style;
}
