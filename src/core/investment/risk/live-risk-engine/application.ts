import {
  ensureLiveRiskInput,
  ensureOverrideRequest,
  type LiveRiskCheckResult,
  type LiveRiskDecision,
  type LiveRiskEvaluationInput,
  type LiveRiskEvaluationResult,
  type LiveRiskSeverity,
} from "./domain";
import type { LiveRiskAuditStore } from "./infrastructure";

type CheckDef = Omit<LiveRiskCheckResult, "status"> & { readonly passed: boolean };

function check(
  category: LiveRiskCheckResult["category"],
  code: string,
  severity: LiveRiskSeverity,
  passed: boolean,
  value: number | string | boolean,
  threshold: number | string | boolean,
  explanation: string,
  remediation: string,
): CheckDef {
  return { category, code, severity, passed, value, threshold, explanation, remediation };
}

function toResult(def: CheckDef): LiveRiskCheckResult {
  return { ...def, status: def.passed ? "PASS" : "FAIL" };
}

export class LiveRiskEvaluator {
  constructor(private readonly auditStore: LiveRiskAuditStore) {}

  async evaluate(input: LiveRiskEvaluationInput): Promise<LiveRiskEvaluationResult> {
    const safeInput = ensureLiveRiskInput(input);
    const existing = await this.auditStore.findByRequestId(safeInput.requestId);
    if (existing) {
      return existing.result;
    }

    const checks = [
      ...this.accountChecks(safeInput),
      ...this.orderChecks(safeInput),
      ...this.systemChecks(safeInput),
    ];

    const result = this.reduceDecision(safeInput, checks);
    await this.auditStore.write({
      requestId: safeInput.requestId,
      timestampUtc: safeInput.evaluatedAtUtc,
      result,
    });
    return result;
  }

  private reduceDecision(input: LiveRiskEvaluationInput, checks: CheckDef[]): LiveRiskEvaluationResult {
    const failed = checks.filter((it) => !it.passed);
    const decision: LiveRiskDecision = failed.some((it) => it.severity === "HALT")
      ? "HALT_SYSTEM"
      : failed.some((it) => it.severity === "BLOCK")
        ? "BLOCK"
        : failed.some((it) => it.severity === "REDUCE_ONLY")
          ? "PASS_WITH_REDUCED_SIZE"
          : "PASS";

    if (decision === "HALT_SYSTEM") {
      return {
        requestId: input.requestId,
        decision,
        checks: checks.map(toResult),
        explanation: "System safety barrier triggered HALT_SYSTEM.",
        remediation: "Stabilize system controls before retrying.",
      };
    }

    if (decision === "PASS") {
      return {
        requestId: input.requestId,
        decision,
        checks: checks.map(toResult),
        explanation: "All live risk checks passed.",
        remediation: "No remediation required.",
      };
    }

    if (decision === "PASS_WITH_REDUCED_SIZE") {
      const quantityCaps = [
        input.order.maxQuantity,
        input.order.maxNotional / Math.max(input.order.price, input.order.tickSize),
        input.order.maxRiskPerTrade / Math.max(input.order.requestedRiskPerTrade / input.order.requestedQuantity, 0.0001),
      ];
      const reducedQuantity = Math.max(1, Math.floor(Math.min(...quantityCaps)));
      return {
        requestId: input.requestId,
        decision,
        checks: checks.map(toResult),
        reducedQuantity,
        explanation: "Order can proceed only with reduced size.",
        remediation: `Reduce quantity to ${reducedQuantity} or lower.`,
      };
    }

    const overrideResult = this.tryApplyOverride(input, checks);
    if (overrideResult) {
      return overrideResult;
    }
    return {
      requestId: input.requestId,
      decision: "BLOCK",
      checks: checks.map(toResult),
      explanation: "Risk barrier blocked live submission.",
      remediation: "Fix failing checks or request audited human override.",
    };
  }

  private tryApplyOverride(
    input: LiveRiskEvaluationInput,
    checks: CheckDef[],
  ): LiveRiskEvaluationResult | null {
    if (!input.overrideRequest) {
      return null;
    }
    const override = ensureOverrideRequest(input.overrideRequest, input.evaluatedAtUtc);
    const failed = checks.filter((it) => !it.passed);
    if (failed.some((it) => it.severity === "HALT")) {
      return null;
    }

    const allowedSet = new Set(override.allowedCheckCodes ?? failed.map((it) => it.code));
    const nonOverridden = failed.filter((it) => !allowedSet.has(it.code));
    if (nonOverridden.length > 0) {
      return null;
    }

    void this.auditStore.writeOverride(override);
    return {
      requestId: input.requestId,
      decision: "PASS",
      checks: checks.map(toResult),
      explanation: "Human override accepted for non-HALT checks.",
      remediation: "Proceed under temporary override constraints.",
      overrideAudit: {
        applied: true,
        overrideId: override.overrideId,
        by: override.identity,
        reason: override.reason,
        expiresAtUtc: override.expiresAtUtc,
      },
    };
  }

  private accountChecks(input: LiveRiskEvaluationInput): CheckDef[] {
    const a = input.account;
    return [
      check("ACCOUNT", "available_capital", "BLOCK", a.availableCapital > 0, a.availableCapital, "> 0", "Available capital check", "Increase available capital."),
      check("ACCOUNT", "available_margin", "BLOCK", a.availableMargin > 0, a.availableMargin, "> 0", "Available margin check", "Increase margin headroom."),
      check("ACCOUNT", "excess_liquidity", "BLOCK", a.excessLiquidity > 0, a.excessLiquidity, "> 0", "Excess liquidity check", "Fund account or reduce exposure."),
      check("ACCOUNT", "daily_drawdown", "BLOCK", a.dailyDrawdownPct <= 100, a.dailyDrawdownPct, "<= 100", "Daily drawdown within budget", "Reduce risk and losses."),
      check("ACCOUNT", "weekly_drawdown", "BLOCK", a.weeklyDrawdownPct <= 100, a.weeklyDrawdownPct, "<= 100", "Weekly drawdown within budget", "Reduce weekly loss profile."),
      check("ACCOUNT", "monthly_drawdown", "BLOCK", a.monthlyDrawdownPct <= 100, a.monthlyDrawdownPct, "<= 100", "Monthly drawdown within budget", "Reduce monthly loss profile."),
      check("ACCOUNT", "max_daily_loss", "BLOCK", a.currentDailyLoss <= a.maxDailyLoss, a.currentDailyLoss, a.maxDailyLoss, "Max daily loss check", "Stop adding risk until losses recover."),
      check("ACCOUNT", "max_number_of_orders", "BLOCK", a.currentNumberOfOrders < a.maxNumberOfOrders, a.currentNumberOfOrders, a.maxNumberOfOrders, "Order count check", "Wait for existing orders to close."),
      check("ACCOUNT", "max_number_of_positions", "BLOCK", a.currentNumberOfPositions < a.maxNumberOfPositions, a.currentNumberOfPositions, a.maxNumberOfPositions, "Position count check", "Flatten or net positions."),
      check("ACCOUNT", "gross_exposure", "BLOCK", a.grossExposure <= a.maxGrossExposure, a.grossExposure, a.maxGrossExposure, "Gross exposure check", "Reduce gross exposure."),
      check("ACCOUNT", "net_exposure", "BLOCK", Math.abs(a.netExposure) <= a.maxNetExposure, a.netExposure, a.maxNetExposure, "Net exposure check", "Rebalance directional risk."),
      check("ACCOUNT", "leverage", "BLOCK", a.leverage <= a.maxLeverage, a.leverage, a.maxLeverage, "Leverage check", "Reduce leverage."),
      check("ACCOUNT", "concentration", "BLOCK", a.concentration <= a.maxConcentration, a.concentration, a.maxConcentration, "Concentration check", "Diversify exposure."),
      check("ACCOUNT", "currency", "BLOCK", a.allowedCurrencies.includes(a.currency), a.currency, a.allowedCurrencies.join(","), "Currency allow-list check", "Use approved currency only."),
      check("ACCOUNT", "country", "BLOCK", a.allowedCountries.includes(a.country), a.country, a.allowedCountries.join(","), "Country allow-list check", "Use approved country only."),
      check("ACCOUNT", "sector", "BLOCK", a.allowedSectors.includes(a.sector), a.sector, a.allowedSectors.join(","), "Sector allow-list check", "Use approved sector only."),
      check("ACCOUNT", "correlation", "BLOCK", a.correlation <= a.maxCorrelation, a.correlation, a.maxCorrelation, "Correlation check", "Reduce correlated exposure."),
      check("ACCOUNT", "gap_risk", "BLOCK", a.gapRisk <= a.maxGapRisk, a.gapRisk, a.maxGapRisk, "Gap risk check", "Lower overnight/event exposure."),
    ];
  }

  private orderChecks(input: LiveRiskEvaluationInput): CheckDef[] {
    const o = input.order;
    const priceTickAligned = Math.abs(o.price / o.tickSize - Math.round(o.price / o.tickSize)) < 1e-9;
    return [
      check("ORDER", "max_quantity", "REDUCE_ONLY", o.requestedQuantity <= o.maxQuantity, o.requestedQuantity, o.maxQuantity, "Max quantity check", "Reduce quantity."),
      check("ORDER", "max_notional", "REDUCE_ONLY", o.requestedNotional <= o.maxNotional, o.requestedNotional, o.maxNotional, "Max notional check", "Reduce notional."),
      check("ORDER", "max_risk_per_trade", "REDUCE_ONLY", o.requestedRiskPerTrade <= o.maxRiskPerTrade, o.requestedRiskPerTrade, o.maxRiskPerTrade, "Max risk-per-trade check", "Reduce trade risk."),
      check("ORDER", "mandatory_stop", "BLOCK", o.mandatoryStopPresent, o.mandatoryStopPresent, true, "Mandatory stop check", "Attach stop-loss before submit."),
      check("ORDER", "stop_distance", "BLOCK", o.stopDistance >= o.minStopDistance, o.stopDistance, o.minStopDistance, "Stop distance check", "Widen stop distance."),
      check("ORDER", "max_spread", "BLOCK", o.spreadBps <= o.maxSpreadBps, o.spreadBps, o.maxSpreadBps, "Spread check", "Wait for tighter spread."),
      check("ORDER", "max_slippage", "BLOCK", o.slippageBps <= o.maxSlippageBps, o.slippageBps, o.maxSlippageBps, "Slippage check", "Use smaller slices."),
      check("ORDER", "minimum_volume", "BLOCK", o.volume >= o.minVolume, o.volume, o.minVolume, "Minimum volume check", "Trade only when liquidity is sufficient."),
      check("ORDER", "valid_price", "BLOCK", o.price > 0, o.price, "> 0", "Valid price check", "Refresh quote."),
      check("ORDER", "tick_size", "BLOCK", priceTickAligned, o.price, o.tickSize, "Tick-size alignment check", "Round price to tick size."),
      check("ORDER", "allowed_session", "BLOCK", o.inAllowedSession, o.inAllowedSession, true, "Session eligibility check", "Submit during allowed session."),
      check("ORDER", "allowed_product", "BLOCK", o.allowedProduct, o.allowedProduct, true, "Product eligibility check", "Use allowed product."),
      check("ORDER", "allowed_market", "BLOCK", o.allowedMarket, o.allowedMarket, true, "Market eligibility check", "Use allowed market."),
      check("ORDER", "allowed_direction", "BLOCK", o.allowedDirection, o.allowedDirection, true, "Direction eligibility check", "Use allowed direction."),
      check("ORDER", "short_allowed", "BLOCK", o.side === "BUY" || o.shortAllowed, o.shortAllowed, true, "Short-selling permission check", "Disable short or request permission."),
      check("ORDER", "realtime_data_available", "BLOCK", o.realtimeDataAvailable, o.realtimeDataAvailable, true, "Realtime data availability check", "Restore realtime data."),
      check("ORDER", "contract_resolved_without_ambiguity", "BLOCK", o.contractResolvedWithoutAmbiguity, o.contractResolvedWithoutAmbiguity, true, "Contract resolution check", "Resolve instrument mapping ambiguity."),
    ];
  }

  private systemChecks(input: LiveRiskEvaluationInput): CheckDef[] {
    const s = input.system;
    return [
      check("SYSTEM", "stable_connection", "HALT", s.stableConnection, s.stableConnection, true, "Stable connection check", "Restore connectivity."),
      check("SYSTEM", "heartbeat_healthy", "HALT", s.heartbeatHealthy, s.heartbeatHealthy, true, "Heartbeat check", "Recover heartbeat service."),
      check("SYSTEM", "clock_synchronized", "HALT", s.clockSynchronized, s.clockSynchronized, true, "Clock synchronization check", "Resync system clocks."),
      check("SYSTEM", "fresh_data", "HALT", s.freshData, s.freshData, true, "Fresh data check", "Wait for fresh market data."),
      check("SYSTEM", "broker_reconciled", "HALT", s.brokerReconciled, s.brokerReconciled, true, "Broker reconciliation check", "Complete broker reconciliation."),
      check("SYSTEM", "no_orphan_orders", "HALT", s.noOrphanOrders, s.noOrphanOrders, true, "Orphan-order check", "Clear orphan orders."),
      check("SYSTEM", "no_unknown_state", "HALT", s.noUnknownState, s.noUnknownState, true, "Unknown-state check", "Resolve unknown state before trading."),
      check("SYSTEM", "no_emergency_stop", "HALT", s.noEmergencyStop, s.noEmergencyStop, true, "Emergency-stop check", "Manually clear emergency stop."),
      check("SYSTEM", "no_active_circuit_breaker", "HALT", s.noActiveCircuitBreaker, s.noActiveCircuitBreaker, true, "Circuit-breaker check", "Wait until circuit breaker clears."),
    ];
  }
}

export async function enforceLiveRiskBarrierBeforeSubmit(
  evaluator: LiveRiskEvaluator,
  input: LiveRiskEvaluationInput,
): Promise<LiveRiskEvaluationResult> {
  const result = await evaluator.evaluate(input);
  if (result.decision === "HALT_SYSTEM" || result.decision === "BLOCK") {
    return result;
  }
  return result;
}
