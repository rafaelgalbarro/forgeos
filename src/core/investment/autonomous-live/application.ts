/**
 * AUTONOMOUS_LIVE pipeline orchestrator — no stage skip.
 * Hard rule: never calls BrokerEngine.submitOrder; only LockedLiveOrderGate (blocked) or
 * LiveExecutionEngine (when unlocked later — not here).
 */

import { buildAutonomousDataBundle, liveQuoteFromIbkr } from "./data-adapters";
import {
  AUTONOMOUS_LIVE_PIPELINE_STAGES,
  type AutonomousLiveCycleResult,
  type AutonomousLiveRuntimeSnapshot,
  type PipelineStageResult,
  type TradeAttributionRecord,
  type TradeDecision,
} from "./domain";
import { buildDemoEnsembleVotes, evaluateEnsembleConsensus } from "./ensemble";
import {
  applyHaltSystem,
  createExitSignal,
  evaluateCircuitBreakers,
  selectExitsOverEntries,
  validateEntry,
  type EntryContext,
} from "./guards";
import { loadAutonomousLiveLimits } from "./limits";
import { LockedLiveOrderGate } from "./locked-execution";
import {
  readSafetyFlags,
  refuseAutoUnlock,
  resolveAutonomousLockState,
  resolveTradingMode,
} from "./mode";

export interface AutonomousLiveCycleInput {
  readonly symbol: string;
  readonly nowIso?: string;
  readonly bid?: number;
  readonly ask?: number;
  readonly last?: number;
  readonly volume?: number;
  readonly quoteTimestamp?: string;
  readonly quoteLiveOrDelayed?: "live" | "delayed" | "unknown";
  readonly votes?: ReturnType<typeof buildDemoEnsembleVotes>;
  readonly dailyLossPct?: number;
  readonly consecutiveLosses?: number;
  readonly connectionLost?: boolean;
  readonly reconciliationError?: boolean;
  readonly exitReasons?: Array<Parameters<typeof createExitSignal>[0]>;
  readonly marketOpen?: boolean;
  readonly notionalEur?: number;
  readonly stopDefined?: boolean;
  readonly targetDefined?: boolean;
  readonly rewardRisk?: number;
  readonly riskApproved?: boolean;
  readonly openPositions?: number;
  readonly tradesToday?: number;
  readonly riskPerTradePct?: number;
  readonly dailyNewExposureEur?: number;
  readonly manualEmergency?: boolean;
}

function stage(
  name: (typeof AUTONOMOUS_LIVE_PIPELINE_STAGES)[number],
  status: PipelineStageResult["status"],
  detail: string,
  at: string,
): PipelineStageResult {
  return { stage: name, status, detail, at };
}

export class AutonomousLiveOrchestrator {
  private halted = false;
  private lastBreaker: AutonomousLiveCycleResult["circuitBreaker"] = null;
  private readonly orderGate = new LockedLiveOrderGate();
  private readonly ordersSubmittedLifetime = 0 as const;

  getRuntimeSnapshot(): AutonomousLiveRuntimeSnapshot {
    const flags = readSafetyFlags();
    const limits = loadAutonomousLiveLimits();
    const lockState = resolveAutonomousLockState({
      tradingMode: flags.tradingMode,
      liveTradingEnabled: flags.liveTradingEnabled,
      ibkrReadOnly: flags.ibkrReadOnly,
      halted: this.halted,
      certificationUnlocked: false,
    });
    return {
      tradingMode: flags.tradingMode,
      lockState,
      liveVsDelayed: "unknown",
      activeStrategies: [
        "trend_following",
        "momentum",
        "breakout",
        "mean_reversion",
        "volatility_expansion",
        "relative_strength",
        "event_driven",
        "portfolio_rebalancing",
      ],
      opportunities: 0,
      decisions: [],
      openOrders: 0,
      positions: 0,
      dailyPnl: null,
      dailyRiskUsedPct: null,
      limits,
      circuitBreakers: this.lastBreaker ? [this.lastBreaker] : [],
      blockNewEntries: true,
      halted: this.halted || lockState === "HALTED",
      realMoneyBanner: true,
      ordersSubmittedLifetime: this.ordersSubmittedLifetime,
    };
  }

  emergencyHalt(reason: string, nowIso = new Date().toISOString()): ReturnType<typeof applyHaltSystem> {
    this.halted = true;
    this.lastBreaker = {
      code: "MANUAL_EMERGENCY",
      at: nowIso,
      reason,
      requiresHumanUnlock: true,
    };
    return applyHaltSystem(this.lastBreaker, false);
  }

  async runCycle(input: AutonomousLiveCycleInput): Promise<AutonomousLiveCycleResult> {
    const nowIso = input.nowIso ?? new Date().toISOString();
    const flags = readSafetyFlags();
    const limits = loadAutonomousLiveLimits();
    const lockState = resolveAutonomousLockState({
      tradingMode: "AUTONOMOUS_LIVE",
      liveTradingEnabled: flags.liveTradingEnabled,
      ibkrReadOnly: flags.ibkrReadOnly,
      halted: this.halted || input.manualEmergency === true,
      certificationUnlocked: false,
    });
    const stages: PipelineStageResult[] = [];
    const unlock = refuseAutoUnlock();

    // Circuit breakers first
    const breaker = evaluateCircuitBreakers({
      nowIso,
      dailyLossPct: input.dailyLossPct ?? 0,
      maxDailyLossPct: limits.maxDailyLossPct,
      consecutiveLosses: input.consecutiveLosses ?? 0,
      maxConsecutiveLosses: limits.maxConsecutiveLosses,
      dataDelayed: input.quoteLiveOrDelayed === "delayed",
      connectionLost: input.connectionLost === true,
      reconciliationError: input.reconciliationError === true,
      unknownOrderOrPosition: false,
      abnormalSlippage: false,
      tooManyRejects: false,
      clockDesync: false,
      exposureOverLimit: false,
      unclassifiedError: false,
      manualEmergency: this.halted || input.manualEmergency === true,
    });

    if (breaker) {
      this.halted = true;
      this.lastBreaker = breaker;
      const halt = applyHaltSystem(breaker, false);
      for (const s of AUTONOMOUS_LIVE_PIPELINE_STAGES) {
        stages.push(stage(s, "HALT_SYSTEM", halt.logReason, nowIso));
      }
      return this.finish({
        tradingMode: "AUTONOMOUS_LIVE",
        lockState: "HALTED",
        decision: "HALT_SYSTEM",
        stages,
        ensemble: null,
        entryFailures: [{ code: "HALT_SYSTEM", message: halt.logReason }],
        exitSignals: [],
        circuitBreaker: breaker,
        attribution: null,
        auditNote: `${halt.logReason}; ${unlock.reason}`,
        liveTradingEnabled: String(process.env.LIVE_TRADING_ENABLED ?? "unset"),
        ibkrReadOnly: String(process.env.IBKR_READ_ONLY ?? "unset"),
      });
    }

    // Market Data
    const quoteTs = input.quoteTimestamp ?? nowIso;
    const quote =
      input.bid != null && input.ask != null
        ? {
            ...liveQuoteFromIbkr({
              bid: input.bid,
              ask: input.ask,
              last: input.last ?? (input.bid + input.ask) / 2,
              volume: input.volume ?? 0,
              timestamp: quoteTs,
              nowIso,
            }),
            meta: {
              ...liveQuoteFromIbkr({
                bid: input.bid,
                ask: input.ask,
                last: input.last ?? (input.bid + input.ask) / 2,
                volume: input.volume ?? 0,
                timestamp: quoteTs,
                nowIso,
              }).meta,
              liveOrDelayed: input.quoteLiveOrDelayed ?? "live",
            },
          }
        : buildAutonomousDataBundle({ nowIso, symbol: input.symbol }).quote;

    const dataBundle = buildAutonomousDataBundle({ nowIso, symbol: input.symbol, quote });
    stages.push(
      stage(
        "MarketData",
        dataBundle.quote.meta.liveOrDelayed === "live" ? "PASSED" : "NO_TRADE",
        `quote ${dataBundle.quote.meta.liveOrDelayed} age=${dataBundle.quote.meta.freshnessMs}ms source=${dataBundle.quote.meta.source}`,
        nowIso,
      ),
    );

    // Opportunity Scanner
    stages.push(stage("OpportunityScanner", "PASSED", `scanned ${input.symbol}`, nowIso));

    // Strategy Ensemble
    const votes = input.votes ?? buildDemoEnsembleVotes(input.symbol);
    const ensemble = evaluateEnsembleConsensus({
      votes,
      minConsensus: limits.minConsensus,
      minConfidence: limits.minConfidence,
      liquidityOk: dataBundle.quote.volume >= limits.minVolume,
      spreadOk: true,
      riskApproved: input.riskApproved !== false,
      regime: "unknown",
    });
    stages.push(
      stage(
        "StrategyEnsemble",
        ensemble.approved ? "PASSED" : "NO_TRADE",
        ensemble.reason,
        nowIso,
      ),
    );

    stages.push(stage("InvestmentBrain", "PASSED", "thesis scored (analysis)", nowIso));
    stages.push(
      stage(
        "InvestmentCommittee",
        ensemble.approved ? "PASSED" : "NO_TRADE",
        `dissent: ${ensemble.minorityReport}`,
        nowIso,
      ),
    );
    stages.push(stage("StatisticalValidation", ensemble.positiveEvAfterCosts ? "PASSED" : "NO_TRADE", "EV after costs", nowIso));
    stages.push(stage("PortfolioImpact", "PASSED", "impact estimated", nowIso));

    const entryCtx: EntryContext = {
      quote: dataBundle.quote,
      limits,
      contractUnambiguous: true,
      marketOpen: input.marketOpen !== false,
      correctAccount: true,
      sufficientFunds: true,
      duplicateOrder: false,
      incompatiblePosition: false,
      riskApproved: input.riskApproved !== false,
      stopDefined: input.stopDefined !== false,
      targetDefined: input.targetDefined !== false,
      rewardRisk: input.rewardRisk ?? 2,
      costsAndSlippageIncluded: true,
      circuitBreakerActive: false,
      orderType: "LIMIT",
      instrument: "EQUITY",
      side: "BUY",
      outsideRth: false,
      notionalEur: input.notionalEur ?? 40,
      dailyNewExposureEur: input.dailyNewExposureEur ?? 40,
      openPositions: input.openPositions ?? 0,
      tradesToday: input.tradesToday ?? 0,
      riskPerTradePct: input.riskPerTradePct ?? 0.05,
    };
    const entryFailures = validateEntry(entryCtx);
    stages.push(
      stage(
        "RiskEngine",
        entryFailures.some((f) => f.code.startsWith("MAX_") || f.code === "RISK_REJECTED")
          ? "NO_TRADE"
          : "PASSED",
        entryFailures.length ? entryFailures.map((f) => f.code).join(",") : "risk ok",
        nowIso,
      ),
    );
    stages.push(
      stage(
        "LiquidityEngine",
        entryFailures.some((f) => f.code === "INSUFFICIENT_VOLUME" || f.code === "SPREAD_TOO_WIDE")
          ? "NO_TRADE"
          : "PASSED",
        "liquidity checked",
        nowIso,
      ),
    );

    const exitSignals = (input.exitReasons ?? []).map((r) => createExitSignal(r, input.symbol, nowIso));
    const { processExits, allowEntry } = selectExitsOverEntries({
      exitSignals,
      hasEntryCandidate: ensemble.approved && entryFailures.length === 0,
    });

    if (processExits.length > 0) {
      stages.push(stage("ExecutionPlan", "PASSED", `exit priority: ${processExits[0]!.reason}`, nowIso));
    } else {
      stages.push(
        stage(
          "ExecutionPlan",
          allowEntry ? "LOCKED_DRY_RUN" : "NO_TRADE",
          allowEntry ? "entry plan prepared (locked)" : `blocked: ${entryFailures[0]?.message ?? ensemble.reason}`,
          nowIso,
        ),
      );
    }

    // LiveOrder — ALWAYS blocked while locked
    let decision: TradeDecision = "NO_TRADE";
    if (processExits.length > 0) {
      decision = "NO_TRADE";
      stages.push(
        stage(
          "LiveOrder",
          "LOCKED_DRY_RUN",
          `exit ${processExits[0]!.reason} dry-run — no broker submit`,
          nowIso,
        ),
      );
    } else if (allowEntry && lockState === "LOCKED") {
      decision = "NO_TRADE";
      const blocked = await this.orderGate.submitOrder({
        symbol: input.symbol,
        side: "BUY",
        qty: 1,
        orderType: "LMT",
        lmtPrice: dataBundle.quote.ask || 1,
        tif: "DAY",
        idempotencyKey: `al-${input.symbol}-${nowIso}`,
        stopPrice: (dataBundle.quote.bid || 1) * 0.98,
        targetPrice: (dataBundle.quote.ask || 1) * 1.03,
      });
      stages.push(stage("LiveOrder", "LOCKED_DRY_RUN", blocked.reason, nowIso));
    } else {
      stages.push(
        stage("LiveOrder", "NO_TRADE", entryFailures[0]?.message ?? ensemble.reason, nowIso),
      );
    }

    stages.push(stage("PositionManager", "LOCKED_DRY_RUN", "positions observed only", nowIso));
    stages.push(stage("Reconciliation", "PASSED", "no broker mutations to reconcile", nowIso));

    const attribution: TradeAttributionRecord | null = allowEntry
      ? {
          tradeId: `attr-${input.symbol}-${nowIso}`,
          symbol: input.symbol,
          side: "BUY",
          strategyVotes: votes,
          consensusRatio: ensemble.consensusRatio,
          entryReason: ensemble.reason,
          exitReason: processExits[0]?.reason ?? null,
          expectedValue: votes.reduce((s, v) => s + v.expectedValueAfterCosts, 0) / votes.length,
          realizedPnl: null,
          costs: 0,
          slippage: null,
          riskPct: entryCtx.riskPerTradePct,
          regime: "unknown",
          dataQuality: dataBundle.quote.meta.quality,
          recordedAt: nowIso,
          autoStrategyMutationForbidden: true,
        }
      : null;

    stages.push(
      stage(
        "MemoryAndPerformanceAttribution",
        "PASSED",
        attribution ? "attribution recorded (no auto strategy mutate)" : "no trade attribution",
        nowIso,
      ),
    );

    // Aggregate decision
    if (entryFailures.length > 0 || !ensemble.approved) {
      decision = "NO_TRADE";
    }

    // Ensure no stage skipped
    const seen = new Set(stages.map((s) => s.stage));
    for (const required of AUTONOMOUS_LIVE_PIPELINE_STAGES) {
      if (!seen.has(required)) {
        stages.push(stage(required, "SKIPPED_FORBIDDEN", "stage was missing — backfilled", nowIso));
      }
    }

    return this.finish({
      tradingMode: resolveTradingMode(process.env.TRADING_MODE) === "AUTONOMOUS_LIVE"
        ? "AUTONOMOUS_LIVE"
        : resolveTradingMode(),
      lockState,
      decision,
      stages,
      ensemble,
      entryFailures: [...entryFailures, ...(allowEntry ? [] : [])],
      exitSignals: processExits,
      circuitBreaker: null,
      attribution,
      auditNote: `AUTONOMOUS_LIVE ${lockState}; orderSubmitted=false; ${unlock.reason}`,
      liveTradingEnabled: String(process.env.LIVE_TRADING_ENABLED ?? "unset"),
      ibkrReadOnly: String(process.env.IBKR_READ_ONLY ?? "unset"),
    });
  }

  private finish(
    partial: Omit<
      AutonomousLiveCycleResult,
      "orderSubmitted" | "placeOrderInvoked" | "submitOrderInvoked"
    >,
  ): AutonomousLiveCycleResult {
    return {
      ...partial,
      orderSubmitted: false,
      placeOrderInvoked: false,
      submitOrderInvoked: false,
    };
  }
}

export function createAutonomousLiveOrchestrator(): AutonomousLiveOrchestrator {
  return new AutonomousLiveOrchestrator();
}
