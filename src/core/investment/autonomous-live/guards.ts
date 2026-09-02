/**
 * Entry validations — any failure → NO_TRADE.
 * Exit signals — absolute priority over entries; no duplicate exit orders.
 * Circuit breakers → HALT_SYSTEM.
 */

import {
  EXIT_PRIORITY,
  type AutonomousLiveLimits,
  type CircuitBreakerCode,
  type CircuitBreakerEvent,
  type EntryValidationFailure,
  type ExitReason,
  type ExitSignal,
} from "./domain";
import { validateQuoteForEntry, type QuoteSnapshot } from "./data-quality";

export interface EntryContext {
  readonly quote: QuoteSnapshot;
  readonly limits: AutonomousLiveLimits;
  readonly contractUnambiguous: boolean;
  readonly marketOpen: boolean;
  readonly correctAccount: boolean;
  readonly sufficientFunds: boolean;
  readonly duplicateOrder: boolean;
  readonly incompatiblePosition: boolean;
  readonly riskApproved: boolean;
  readonly stopDefined: boolean;
  readonly targetDefined: boolean;
  readonly rewardRisk: number;
  readonly costsAndSlippageIncluded: boolean;
  readonly circuitBreakerActive: boolean;
  readonly orderType: "LIMIT" | "MARKET";
  readonly instrument: "EQUITY" | "OPTION" | "FUTURE" | "FOREX" | "CRYPTO";
  readonly side: "BUY" | "SELL_SHORT";
  readonly outsideRth: boolean;
  readonly notionalEur: number;
  readonly dailyNewExposureEur: number;
  readonly openPositions: number;
  readonly tradesToday: number;
  readonly riskPerTradePct: number;
}

export function validateEntry(ctx: EntryContext): EntryValidationFailure[] {
  const failures: EntryValidationFailure[] = [
    ...validateQuoteForEntry(ctx.quote, {
      maxAgeMs: ctx.limits.maxQuoteAgeMs,
      maxSpreadBps: ctx.limits.maxSpreadBps,
      minVolume: ctx.limits.minVolume,
      liveDataRequired: ctx.limits.liveDataRequired,
    }),
  ];

  if (!ctx.contractUnambiguous) {
    failures.push({ code: "AMBIGUOUS_CONTRACT", message: "NO_TRADE: contract ambiguous" });
  }
  if (!ctx.marketOpen) {
    failures.push({ code: "MARKET_CLOSED", message: "NO_TRADE: market not open" });
  }
  if (!ctx.correctAccount) {
    failures.push({ code: "WRONG_ACCOUNT", message: "NO_TRADE: incorrect account" });
  }
  if (!ctx.sufficientFunds) {
    failures.push({ code: "INSUFFICIENT_FUNDS", message: "NO_TRADE: insufficient funds" });
  }
  if (ctx.duplicateOrder) {
    failures.push({ code: "DUPLICATE_ORDER", message: "NO_TRADE: duplicate order" });
  }
  if (ctx.incompatiblePosition) {
    failures.push({ code: "INCOMPATIBLE_POSITION", message: "NO_TRADE: incompatible position" });
  }
  if (!ctx.riskApproved) {
    failures.push({ code: "RISK_REJECTED", message: "NO_TRADE: risk not approved" });
  }
  if (ctx.limits.stopLossRequired && !ctx.stopDefined) {
    failures.push({ code: "STOP_REQUIRED", message: "NO_TRADE: stop loss required" });
  }
  if (!ctx.targetDefined) {
    failures.push({ code: "TARGET_REQUIRED", message: "NO_TRADE: target required" });
  }
  if (ctx.rewardRisk < ctx.limits.minRewardRisk) {
    failures.push({
      code: "REWARD_RISK",
      message: `NO_TRADE: reward/risk ${ctx.rewardRisk} < ${ctx.limits.minRewardRisk}`,
    });
  }
  if (!ctx.costsAndSlippageIncluded) {
    failures.push({ code: "COSTS_MISSING", message: "NO_TRADE: costs/slippage not included" });
  }
  if (ctx.circuitBreakerActive) {
    failures.push({ code: "CIRCUIT_BREAKER", message: "NO_TRADE: circuit breaker active" });
  }
  if (ctx.limits.limitOrdersOnly && ctx.orderType !== "LIMIT") {
    failures.push({ code: "LIMIT_ONLY", message: "NO_TRADE: LIMIT orders only" });
  }
  if (ctx.instrument !== "EQUITY") {
    failures.push({ code: "PRODUCT_BLOCKED", message: `NO_TRADE: ${ctx.instrument} not allowed` });
  }
  if (ctx.side === "SELL_SHORT" && !ctx.limits.allowShort) {
    failures.push({ code: "SHORT_BLOCKED", message: "NO_TRADE: short selling disabled" });
  }
  if (ctx.outsideRth && !ctx.limits.allowOutsideRth) {
    failures.push({ code: "OUTSIDE_RTH", message: "NO_TRADE: outside RTH disabled" });
  }
  if (ctx.notionalEur > ctx.limits.maxOrderNotionalEur) {
    failures.push({
      code: "MAX_NOTIONAL",
      message: `NO_TRADE: notional ${ctx.notionalEur} > ${ctx.limits.maxOrderNotionalEur}`,
    });
  }
  if (ctx.dailyNewExposureEur > ctx.limits.maxNewExposureDailyEur) {
    failures.push({
      code: "MAX_DAILY_EXPOSURE",
      message: "NO_TRADE: daily new exposure limit",
    });
  }
  if (ctx.openPositions >= ctx.limits.maxOpenPositions) {
    failures.push({ code: "MAX_POSITIONS", message: "NO_TRADE: max open positions" });
  }
  if (ctx.tradesToday >= ctx.limits.maxTradesPerDay) {
    failures.push({ code: "MAX_TRADES", message: "NO_TRADE: max trades per day" });
  }
  if (ctx.riskPerTradePct > ctx.limits.maxRiskPerTradePct) {
    failures.push({ code: "MAX_RISK_PCT", message: "NO_TRADE: risk per trade pct exceeded" });
  }

  return failures;
}

export function prioritizeExits(signals: readonly ExitSignal[]): ExitSignal[] {
  return [...signals].sort((a, b) => a.priority - b.priority);
}

export function createExitSignal(
  reason: ExitReason,
  symbol: string,
  at: string,
  duplicateOfOrderId?: string,
): ExitSignal {
  const priority = EXIT_PRIORITY.indexOf(reason);
  return {
    reason,
    symbol,
    priority: priority < 0 ? EXIT_PRIORITY.length : priority,
    at,
    duplicateOfOrderId,
  };
}

/** Exits beat entries. Drop duplicate exit orders for the same symbol+reason. */
export function selectExitsOverEntries(args: {
  readonly exitSignals: readonly ExitSignal[];
  readonly hasEntryCandidate: boolean;
}): { processExits: ExitSignal[]; allowEntry: boolean } {
  const unique = new Map<string, ExitSignal>();
  for (const signal of prioritizeExits(args.exitSignals)) {
    const key = `${signal.symbol}:${signal.reason}`;
    if (signal.duplicateOfOrderId) continue;
    if (!unique.has(key)) unique.set(key, signal);
  }
  const processExits = [...unique.values()];
  return {
    processExits,
    allowEntry: processExits.length === 0 && args.hasEntryCandidate,
  };
}

export function evaluateCircuitBreakers(args: {
  readonly nowIso: string;
  readonly dailyLossPct: number;
  readonly maxDailyLossPct: number;
  readonly consecutiveLosses: number;
  readonly maxConsecutiveLosses: number;
  readonly dataDelayed: boolean;
  readonly connectionLost: boolean;
  readonly reconciliationError: boolean;
  readonly unknownOrderOrPosition: boolean;
  readonly abnormalSlippage: boolean;
  readonly tooManyRejects: boolean;
  readonly clockDesync: boolean;
  readonly exposureOverLimit: boolean;
  readonly unclassifiedError: boolean;
  readonly manualEmergency: boolean;
}): CircuitBreakerEvent | null {
  const checks: Array<{ ok: boolean; code: CircuitBreakerCode; reason: string }> = [
    {
      ok: args.manualEmergency,
      code: "MANUAL_EMERGENCY",
      reason: "Manual emergency stop",
    },
    {
      ok: args.dailyLossPct >= args.maxDailyLossPct,
      code: "DAILY_MAX_LOSS",
      reason: `Daily loss ${args.dailyLossPct}% >= ${args.maxDailyLossPct}%`,
    },
    {
      ok: args.consecutiveLosses >= args.maxConsecutiveLosses,
      code: "CONSECUTIVE_LOSSES",
      reason: `${args.consecutiveLosses} consecutive losses`,
    },
    { ok: args.dataDelayed, code: "DELAYED_DATA", reason: "Delayed market data" },
    { ok: args.connectionLost, code: "CONNECTION_LOSS", reason: "Broker connection lost" },
    {
      ok: args.reconciliationError,
      code: "RECONCILIATION_ERROR",
      reason: "Reconciliation error",
    },
    {
      ok: args.unknownOrderOrPosition,
      code: "UNKNOWN_ORDER_OR_POSITION",
      reason: "Unknown order or position",
    },
    { ok: args.abnormalSlippage, code: "ABNORMAL_SLIPPAGE", reason: "Abnormal slippage" },
    { ok: args.tooManyRejects, code: "TOO_MANY_REJECTS", reason: "Too many order rejects" },
    { ok: args.clockDesync, code: "CLOCK_DESYNC", reason: "Clock desynchronization" },
    { ok: args.exposureOverLimit, code: "EXPOSURE_OVER_LIMIT", reason: "Exposure over limit" },
    { ok: args.unclassifiedError, code: "UNCLASSIFIED_ERROR", reason: "Unclassified error" },
  ];

  for (const check of checks) {
    if (check.ok) {
      return {
        code: check.code,
        at: args.nowIso,
        reason: check.reason,
        requiresHumanUnlock: true,
      };
    }
  }
  return null;
}

export interface HaltSystemActions {
  readonly blockNewEntries: true;
  readonly defensivePositionManagement: true;
  readonly cancelEntryOrders: "DRY_RUN" | "LIVE";
  readonly logReason: string;
  readonly requiresHumanUnlock: true;
  readonly orderSubmitted: false;
}

export function applyHaltSystem(
  event: CircuitBreakerEvent,
  unlocked: boolean,
): HaltSystemActions {
  return {
    blockNewEntries: true,
    defensivePositionManagement: true,
    cancelEntryOrders: unlocked ? "LIVE" : "DRY_RUN",
    logReason: `HALT_SYSTEM: ${event.code} — ${event.reason}`,
    requiresHumanUnlock: true,
    orderSubmitted: false,
  };
}
