/**
 * Dynamic position sizing — cash/NAV-based limits (stocks + FOREX policy).
 * Recalculated on every risk check; daily rebalance hook on session date change.
 */

import { TRADING_CONFIG } from "./trading.config";
import { loadTradingState, updateTradingState } from "./trading-state-store";

export type DynamicSizingSnapshot = {
  readonly cashUSD: number;
  readonly navUSD: number;
  readonly deployableCashUSD: number;
  readonly liquidityReserveUSD: number;
  readonly maxOrderValueUSD: number;
  readonly maxOrderPct: number;
  readonly maxOpenPositions: number;
  readonly analysisOnly: boolean;
  readonly canTradeStocks: boolean;
  readonly canTradeForex: boolean;
  readonly stopLossPct: number;
  readonly takeProfitPct: number;
  readonly trailingStopPct: number;
  readonly forexRiskPctNav: number;
  readonly forexMinNavUSD: number;
  readonly rebalanceDate: string;
  /** UI label, e.g. "Tamaño por operación: $20 (20% cash)" */
  readonly operationSizeLabel: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Core sizing from live IBKR cash/NAV. */
export function computeDynamicSizing(params: {
  cashUSD: number;
  navUSD: number;
  confidence?: number;
}): DynamicSizingSnapshot {
  const ds = TRADING_CONFIG.risk.dynamicSizing;
  const cashUSD = Math.max(0, params.cashUSD);
  const navUSD = Math.max(0, params.navUSD);
  const confidence = params.confidence ?? 0;

  const deployableCashUSD = roundMoney(cashUSD * ds.deployableCashPct);
  const liquidityReserveUSD = roundMoney(cashUSD - deployableCashUSD);

  const analysisOnly = cashUSD < ds.analysisOnlyCashUSD;
  const highConfidence = confidence >= ds.highConfidenceThreshold;
  const maxOrderPct = highConfidence ? ds.maxPctHighConfidence : ds.maxPctNormal;

  let maxOrderValueUSD = roundMoney(deployableCashUSD * maxOrderPct);
  if (maxOrderValueUSD > 0 && maxOrderValueUSD < ds.minOrderUSD) {
    maxOrderValueUSD = cashUSD >= ds.minCashToTradeUSD ? ds.minOrderUSD : 0;
  }

  const canTradeStocks =
    !analysisOnly && cashUSD >= ds.minCashToTradeUSD && maxOrderValueUSD >= ds.minOrderUSD;

  const maxOpenPositions = clamp(
    Math.floor(cashUSD / ds.positionCashDivisor),
    ds.minOpenPositions,
    ds.maxOpenPositionsCap,
  );

  const forexMinCashUSD = TRADING_CONFIG.risk.forex.minCashUSD;
  /** FOREX 24h solo con capital suficiente (U15513057 > €2000). */
  const canTradeForex = cashUSD >= forexMinCashUSD;

  const pctLabel = Math.round(maxOrderPct * 100);
  const operationSizeLabel = canTradeStocks
    ? `Tamaño por operación: $${maxOrderValueUSD.toFixed(2)} (${pctLabel}% cash) · máx ${maxOpenPositions} pos`
    : analysisOnly
      ? `Modo solo análisis — cash < $${ds.analysisOnlyCashUSD}`
      : `Sin operaciones — cash mín $${ds.minCashToTradeUSD}`;

  return {
    cashUSD,
    navUSD,
    deployableCashUSD,
    liquidityReserveUSD,
    maxOrderValueUSD,
    maxOrderPct,
    maxOpenPositions,
    analysisOnly,
    canTradeStocks,
    canTradeForex,
    stopLossPct: TRADING_CONFIG.risk.defaultStopLossPct,
    takeProfitPct: TRADING_CONFIG.risk.defaultTakeProfitPct,
    trailingStopPct: TRADING_CONFIG.risk.trailingStopPct,
    forexRiskPctNav: TRADING_CONFIG.risk.forex.riskPctNav,
    forexMinNavUSD: forexMinCashUSD,
    rebalanceDate: new Date().toDateString(),
    operationSizeLabel,
  };
}

/** SL/TP prices from dynamic 2% stop and 1:2 RR. */
export function dynamicStopTakeProfit(
  entryPrice: number,
  direction: "BUY" | "SELL",
  sizing?: Pick<DynamicSizingSnapshot, "stopLossPct" | "takeProfitPct">,
): { stopLoss: number; takeProfit: number } {
  const slPct = sizing?.stopLossPct ?? TRADING_CONFIG.risk.defaultStopLossPct;
  const tpPct = sizing?.takeProfitPct ?? TRADING_CONFIG.risk.defaultTakeProfitPct;
  if (direction === "BUY") {
    return {
      stopLoss: parseFloat((entryPrice * (1 - slPct)).toFixed(4)),
      takeProfit: parseFloat((entryPrice * (1 + tpPct)).toFixed(4)),
    };
  }
  return {
    stopLoss: parseFloat((entryPrice * (1 + slPct)).toFixed(4)),
    takeProfit: parseFloat((entryPrice * (1 - tpPct)).toFixed(4)),
  };
}

/**
 * Daily session rebalance — persists last NAV/cash snapshot when the trading day rolls over.
 * Limits themselves are always derived from live account data on each check.
 */
export function ensureDailySizingRebalance(account: {
  cashUSD: number;
  navUSD: number;
}): DynamicSizingSnapshot {
  const sizing = computeDynamicSizing(account);
  const today = new Date().toDateString();
  const { risk } = loadTradingState();
  if (risk.lastSizingRebalanceDate !== today) {
    updateTradingState((state) => ({
      ...state,
      risk: {
        ...state.risk,
        lastSizingRebalanceDate: today,
        lastRebalanceNavUSD: account.navUSD,
        lastRebalanceCashUSD: account.cashUSD,
      },
    }));
    console.log(
      `[DynamicSizing] Rebalance diario NAV=$${account.navUSD.toFixed(2)} cash=$${account.cashUSD.toFixed(2)} → ${sizing.operationSizeLabel} · máx ${sizing.maxOpenPositions} pos`,
    );
  }
  return sizing;
}
