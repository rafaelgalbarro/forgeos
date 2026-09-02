/**
 * Multi-venture execution coordinator — PROGRAM 6110
 * Integrates with existing Runtime / Task Queue via ExecutionPort.
 */

import { asVentureId } from "../../domain/shared/ids";
import type { ApplicationPorts } from "../ports";
import type { PortfolioProps } from "../../domain/portfolio/aggregate";
import { Portfolio } from "../../domain/portfolio/aggregate";
import type { VenturePriority } from "../../domain/portfolio/types";
import {
  DEFAULT_RISK_POLICY,
  type OperationRiskContext,
  type RiskPolicy,
  type RiskValidationResult,
} from "../../investment/domain/risk";
import { RiskValidationService } from "../../investment/application/risk-validation-service";
import {
  enforceLiveRiskBarrierBeforeSubmit,
  FileLiveRiskAuditStore,
  LiveRiskEvaluator,
  type LiveRiskEvaluationInput,
  type LiveRiskEvaluationResult,
} from "../../investment/risk/live-risk-engine";
import { resolve } from "node:path";

const PRIORITY_WEIGHT: Record<VenturePriority, number> = {
  CRITICAL: 4,
  HIGH: 3,
  NORMAL: 2,
  LOW: 1,
  PAUSED: 0,
};

export type VentureExecutionRequest = Readonly<{
  workspaceId: string;
  portfolioId: string;
  ventureId: string;
  missionId: string;
  priority: VenturePriority;
  executionClass: "AI" | "BUILD" | "PREVIEW" | "RESEARCH";
  resourceRequirements?: Record<string, number>;
  ownerId: string;
  isolationContext: string;
  riskContext?: OperationRiskContext;
  riskPolicy?: RiskPolicy;
  liveRiskInput?: Omit<LiveRiskEvaluationInput, "requestId" | "evaluatedAtUtc">;
}>;

export type VentureExecutionResult = Readonly<{
  ventureId: string;
  missionId: string;
  status: "ACCEPTED" | "QUEUED" | "REJECTED" | "FAILED" | "BLOCKED";
  executionId?: string;
  error?: string;
  riskValidation?: RiskValidationResult;
  liveRisk?: LiveRiskEvaluationResult;
}>;

export type MultiVentureExecutorLimits = Readonly<{
  maxConcurrentPerVenture: number;
  maxConcurrentGlobal: number;
  maxConcurrentPerWorkspace: number;
}>;

const DEFAULT_LIMITS: MultiVentureExecutorLimits = {
  maxConcurrentPerVenture: 2,
  maxConcurrentGlobal: 10,
  maxConcurrentPerWorkspace: 8,
};

export class MultiVentureExecutor {
  private active = new Map<string, VentureExecutionRequest & { startedAt: string }>();
  private failures = new Map<string, string>();

  constructor(
    private readonly ports: ApplicationPorts,
    private readonly limits: MultiVentureExecutorLimits = DEFAULT_LIMITS,
    private readonly riskValidationService: RiskValidationService = new RiskValidationService(),
    private readonly liveRiskEvaluator: LiveRiskEvaluator = new LiveRiskEvaluator(
      new FileLiveRiskAuditStore(resolve(process.cwd(), ".forgeos", "live-risk-audit.json")),
    ),
  ) {}

  getActiveCount(ventureId?: string): number {
    if (!ventureId) return this.active.size;
    return [...this.active.values()].filter((e) => e.ventureId === ventureId).length;
  }

  getExecutionCounts(): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const exec of this.active.values()) {
      counts[exec.ventureId] = (counts[exec.ventureId] ?? 0) + 1;
    }
    return counts;
  }

  getFailure(ventureId: string): string | undefined {
    return this.failures.get(ventureId);
  }

  async submit(
    portfolio: PortfolioProps,
    request: VentureExecutionRequest,
  ): Promise<VentureExecutionResult> {
    const aggregate = Portfolio.rehydrate(portfolio);
    const liveRisk = await enforceLiveRiskBarrierBeforeSubmit(
      this.liveRiskEvaluator,
      request.liveRiskInput
        ? {
            ...request.liveRiskInput,
            requestId: `${request.ventureId}:${request.missionId}:live-risk`,
            evaluatedAtUtc: this.ports.clock.now(),
          }
        : this.buildDefaultLiveRiskInput(request),
    );
    if (liveRisk.decision === "HALT_SYSTEM" || liveRisk.decision === "BLOCK") {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "BLOCKED",
        error: liveRisk.explanation,
        liveRisk,
      };
    }

    const adjustedRiskContext = this.reduceRiskContextFromLiveDecision(request.riskContext, liveRisk);
    const riskValidation = this.riskValidationService.validateOperation(
      adjustedRiskContext ?? this.buildDefaultRiskContext(request),
      request.riskPolicy ?? DEFAULT_RISK_POLICY,
    );
    if (riskValidation.status === "BLOCKED") {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "BLOCKED",
        error: riskValidation.explanation,
        riskValidation,
        liveRisk,
      };
    }

    if (!aggregate.canStartMission(asVentureId(request.ventureId))) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "REJECTED",
        error: "venture closed or archived — cannot start missions",
      };
    }
    if (!aggregate.canStartAutomaticTasks(asVentureId(request.ventureId))) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "REJECTED",
        error: "venture paused — automatic tasks blocked",
      };
    }

    const ventureActive = this.getActiveCount(request.ventureId);
    if (ventureActive >= this.limits.maxConcurrentPerVenture) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "QUEUED",
        error: "venture concurrency limit reached",
      };
    }
    if (this.active.size >= this.limits.maxConcurrentGlobal) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "QUEUED",
        error: "global concurrency limit reached",
      };
    }

    const workspaceActive = [...this.active.values()].filter(
      (e) => e.workspaceId === request.workspaceId,
    ).length;
    if (workspaceActive >= this.limits.maxConcurrentPerWorkspace) {
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "QUEUED",
        error: "workspace concurrency limit reached",
      };
    }

    try {
      const result = await this.ports.execution.requestExecution({
        kind: request.executionClass,
        missionId: request.missionId,
      });
      if (!result.accepted) {
        this.failures.set(request.ventureId, "execution rejected by runtime");
        return {
          ventureId: request.ventureId,
          missionId: request.missionId,
          status: "FAILED",
          error: "execution rejected by runtime",
        };
      }
      const key = result.executionId ?? `${request.ventureId}-${request.missionId}`;
      this.active.set(key, { ...request, startedAt: this.ports.clock.now() });
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "ACCEPTED",
        executionId: key,
        liveRisk,
        riskValidation,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "execution failed";
      this.failures.set(request.ventureId, msg);
      return {
        ventureId: request.ventureId,
        missionId: request.missionId,
        status: "FAILED",
        error: msg,
      };
    }
  }

  release(executionId: string): void {
    this.active.delete(executionId);
  }

  releaseByVenture(ventureId: string): void {
    for (const [id, exec] of this.active.entries()) {
      if (exec.ventureId === ventureId) this.active.delete(id);
    }
  }

  /** Fair ordering: higher priority first, then FIFO within priority */
  orderQueue(requests: VentureExecutionRequest[]): VentureExecutionRequest[] {
    return [...requests].sort((a, b) => {
      const pw = PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority];
      if (pw !== 0) return pw;
      return a.missionId.localeCompare(b.missionId);
    });
  }

  simulateFailure(ventureId: string, reason: string): void {
    this.failures.set(ventureId, reason);
    this.releaseByVenture(ventureId);
  }

  private buildDefaultRiskContext(request: VentureExecutionRequest): OperationRiskContext {
    const nominal = Math.max(
      1,
      Object.values(request.resourceRequirements ?? {}).reduce((sum, value) => sum + value, 0),
    );
    return {
      operationId: `${request.ventureId}:${request.missionId}`,
      symbol: request.missionId,
      side: "BUY",
      quantity: nominal,
      price: 100,
      sector: "VENTURE_OPERATIONS",
      country: "GLOBAL",
      currency: "USD",
      expectedReturnPct: 8,
      volatilityPct: 12,
      confidence: 0.6,
      currentPositionPct: 0,
      currentSectorExposurePct: 0,
      currentCountryExposurePct: 0,
      currentCurrencyExposurePct: 0,
      currentDrawdownPct: 0,
      currentGrossExposurePct: 0,
      portfolioValue: 1_000_000,
      avgDailyVolume: 100_000,
      bidAskSpreadPct: 0.2,
      openPositions: 0,
    };
  }

  private reduceRiskContextFromLiveDecision(
    riskContext: OperationRiskContext | undefined,
    liveRisk: LiveRiskEvaluationResult,
  ): OperationRiskContext | undefined {
    if (!riskContext || liveRisk.decision !== "PASS_WITH_REDUCED_SIZE" || !liveRisk.reducedQuantity) {
      return riskContext;
    }
    return { ...riskContext, quantity: Math.min(riskContext.quantity, liveRisk.reducedQuantity) };
  }

  private buildDefaultLiveRiskInput(
    request: VentureExecutionRequest,
  ): LiveRiskEvaluationInput {
    const riskContext = request.riskContext ?? this.buildDefaultRiskContext(request);
    return {
      requestId: `${request.ventureId}:${request.missionId}:live-risk`,
      evaluatedAtUtc: this.ports.clock.now(),
      account: {
        availableCapital: 1_000_000,
        availableMargin: 500_000,
        excessLiquidity: 250_000,
        dailyDrawdownPct: 5,
        weeklyDrawdownPct: 8,
        monthlyDrawdownPct: 12,
        maxDailyLoss: 50_000,
        currentDailyLoss: 10_000,
        maxNumberOfOrders: 100,
        currentNumberOfOrders: 10,
        maxNumberOfPositions: 80,
        currentNumberOfPositions: riskContext.openPositions,
        grossExposure: riskContext.currentGrossExposurePct,
        maxGrossExposure: 130,
        netExposure: riskContext.currentPositionPct,
        maxNetExposure: 60,
        leverage: 1.2,
        maxLeverage: 3,
        concentration: riskContext.currentSectorExposurePct,
        maxConcentration: 40,
        currency: riskContext.currency,
        allowedCurrencies: [riskContext.currency],
        country: riskContext.country,
        allowedCountries: [riskContext.country],
        sector: riskContext.sector,
        allowedSectors: [riskContext.sector],
        correlation: 0.2,
        maxCorrelation: 0.85,
        gapRisk: 0.15,
        maxGapRisk: 0.8,
      },
      order: {
        requestedQuantity: riskContext.quantity,
        maxQuantity: Math.max(riskContext.quantity, 1_000),
        requestedNotional: riskContext.quantity * riskContext.price,
        maxNotional: Math.max(riskContext.quantity * riskContext.price * 2, 100_000),
        requestedRiskPerTrade: (riskContext.quantity * riskContext.price * riskContext.volatilityPct) / 100,
        maxRiskPerTrade: 25_000,
        mandatoryStopPresent: true,
        stopDistance: 2.5,
        minStopDistance: 1,
        spreadBps: Math.max(1, riskContext.bidAskSpreadPct * 100),
        maxSpreadBps: 150,
        slippageBps: 15,
        maxSlippageBps: 100,
        volume: riskContext.avgDailyVolume,
        minVolume: 1_000,
        price: riskContext.price,
        tickSize: 0.01,
        inAllowedSession: true,
        allowedProduct: true,
        allowedMarket: true,
        allowedDirection: true,
        shortAllowed: true,
        side: riskContext.side === "SELL" ? "SELL_SHORT" : "BUY",
        realtimeDataAvailable: true,
        contractResolvedWithoutAmbiguity: true,
      },
      system: {
        stableConnection: true,
        heartbeatHealthy: true,
        clockSynchronized: true,
        freshData: true,
        brokerReconciled: true,
        noOrphanOrders: true,
        noUnknownState: true,
        noEmergencyStop: true,
        noActiveCircuitBreaker: true,
      },
    };
  }
}
