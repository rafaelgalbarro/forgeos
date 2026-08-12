import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import type { InvestmentMemoryService } from "../application/investment-memory-service";
import type { SerializableValue } from "../domain";
import {
  ExecutionPipelineOrchestrator,
  createDefaultStageEvaluators,
  InMemoryAuditWriter,
  InMemoryEventPublisher,
  InMemoryIdempotencyStore,
  InMemoryPipelineRepository,
  type RunPipelineResult,
} from "../execution-pipeline";
import type {
  PaperOperationOutcome,
  PaperOrderSnapshot,
  PaperSignalInput,
  PaperTradeSubmissionInput,
  PaperTradingCertificationReport,
  PaperTradingConfig,
  PaperTradingDashboardModel,
  PaperTradingPerformanceReport,
} from "./domain";
import {
  assertNeverActivatesLive,
  assertPaperTradingSafe,
  createPaperTradingConfigFromEnv,
} from "./guardrails";
import {
  buildInstitutionalCertificationReport,
  buildPerformanceReport,
  createBrokerPaperPort,
  type PaperBrokerPort,
} from "./infrastructure";

export interface PaperRiskEvaluatorPort {
  evaluate(input: {
    requestId: string;
    symbol: string;
    quantity: number;
    notional: number;
    evaluatedAtUtc: string;
  }): Promise<{
    decision: "PASS" | "PASS_WITH_REDUCED_SIZE" | "BLOCK" | "HALT_SYSTEM";
    explanation: string;
  }>;
}

export interface PaperTradingOrchestratorDeps {
  readonly config: PaperTradingConfig;
  readonly brokerPort: PaperBrokerPort;
  readonly memoryService?: Pick<
    InvestmentMemoryService,
    "recordDecision" | "recordSimulatedOperation" | "recordResult" | "recordError"
  >;
  readonly pipelineFactory?: () => ExecutionPipelineOrchestrator;
  readonly riskEvaluator?: PaperRiskEvaluatorPort;
  readonly now?: () => string;
  readonly createId?: () => string;
}

export interface PaperTradingOrchestrator {
  connect(reconnect?: boolean): Promise<{ connected: boolean; liveTradingEnabled: false }>;
  submitTrade(input: PaperTradeSubmissionInput): Promise<PaperOperationOutcome>;
  decisionAndSend(orderId: string, times?: { decisionTime?: string; sendTime?: string }): Promise<PaperOrderSnapshot>;
  fill(
    orderId: string,
    args: { price: number; quantity?: number; commission?: number; reason?: string; at?: string },
  ): Promise<PaperOrderSnapshot>;
  cancel(orderId: string, reason?: string): Promise<PaperOrderSnapshot>;
  reject(orderId: string, reason?: string): Promise<PaperOrderSnapshot>;
  expire(orderId: string, reason?: string): Promise<PaperOrderSnapshot>;
  mark(orderId: string, markPrice: number): Promise<PaperOrderSnapshot>;
  updateTrailing(orderId: string, trailingOffset: number): Promise<PaperOrderSnapshot>;
  triggerStop(orderId: string, price: number): Promise<PaperOrderSnapshot>;
  triggerTakeProfit(orderId: string, price: number): Promise<PaperOrderSnapshot>;
  getCertificationReport(): Promise<PaperTradingCertificationReport>;
  getPerformanceReport(): Promise<PaperTradingPerformanceReport>;
  getDashboardModel(): Promise<PaperTradingDashboardModel>;
}

function defaultPipelineFactory(): ExecutionPipelineOrchestrator {
  return new ExecutionPipelineOrchestrator({
    repository: new InMemoryPipelineRepository(),
    idempotencyStore: new InMemoryIdempotencyStore(),
    eventPublisher: new InMemoryEventPublisher(),
    auditWriter: new InMemoryAuditWriter(),
    stageEvaluators: createDefaultStageEvaluators("PAPER"),
    liveExecutionEnabled: false,
  });
}

function outcomeBase(
  operationId: string,
  pipelineId: string | null,
  status: PaperOperationOutcome["status"],
  reason: string,
  quantity: number,
): PaperOperationOutcome {
  return {
    operationId,
    pipelineId,
    orderId: null,
    status,
    reason,
    quantity,
    fillPrice: null,
    slippage: null,
    commission: 0,
    latencyMs: 0,
    mae: 0,
    mfe: 0,
    pnl: 0,
    liveTradingActivated: false,
  };
}

function fromOrder(
  operationId: string,
  pipelineId: string | null,
  order: PaperOrderSnapshot,
  status: PaperOperationOutcome["status"],
  reason: string,
): PaperOperationOutcome {
  return {
    operationId,
    pipelineId,
    orderId: order.id,
    status,
    reason,
    quantity: order.quantity - order.remainingQuantity > 0 ? order.quantity - order.remainingQuantity : order.quantity,
    fillPrice: order.metrics.executedPrice,
    slippage: order.metrics.slippage,
    commission: order.metrics.commission,
    latencyMs: order.metrics.latencyMs,
    mae: order.metrics.mae,
    mfe: order.metrics.mfe,
    pnl: order.metrics.pnl,
    liveTradingActivated: false,
  };
}

export function createPaperTradingOrchestrator(deps: PaperTradingOrchestratorDeps): PaperTradingOrchestrator {
  assertPaperTradingSafe(deps.config);
  assertNeverActivatesLive();
  const now = deps.now ?? (() => new Date().toISOString());
  const createId = deps.createId ?? (() => `paper-op-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`);
  const pipelineFactory = deps.pipelineFactory ?? defaultPipelineFactory;

  async function persistDecision(input: PaperTradeSubmissionInput, outcome: PaperOperationOutcome): Promise<void> {
    if (!deps.memoryService) return;
    const occurredAt = input.nowUtc ?? now();
    const indexes = {
      symbol: input.signal.symbol,
      strategy: input.signal.strategy,
      correlationId: input.signal.signalId,
    };
    await deps.memoryService.recordDecision({
      occurredAt,
      provenance: { source: "paper-trading", traceId: outcome.operationId },
      indexes,
      payload: {
        mode: "paper",
        brain: input.brain ?? null,
        committee: input.committee ?? null,
        risk: input.risk ?? null,
        outcome,
      } as unknown as SerializableValue,
    });
    await deps.memoryService.recordSimulatedOperation({
      occurredAt,
      provenance: { source: "paper-trading", traceId: outcome.operationId },
      indexes,
      payload: { mode: "paper", ...outcome } as unknown as SerializableValue,
    });
    await deps.memoryService.recordResult({
      occurredAt,
      provenance: { source: "paper-trading", traceId: outcome.operationId },
      indexes,
      payload: {
        mode: "paper",
        status: outcome.status,
        pnl: outcome.pnl,
        mae: outcome.mae,
        mfe: outcome.mfe,
        liveTradingActivated: false,
      } as unknown as SerializableValue,
    });
  }

  async function runPipeline(signal: PaperSignalInput, pipelineId: string): Promise<RunPipelineResult> {
    const orchestrator = pipelineFactory();
    return orchestrator.run({
      pipelineId,
      symbol: signal.symbol,
      seedArtifact: {
        symbol: signal.symbol,
        side: signal.side,
        confidence: 0.7,
        thesis: signal.thesis,
      },
    });
  }

  return {
    async connect(reconnect = false) {
      assertPaperTradingSafe(deps.config);
      assertNeverActivatesLive();
      const status = await deps.brokerPort.connect(reconnect);
      if (status.liveTradingEnabled) {
        throw new Error("Paper broker reported liveTradingEnabled=true — aborting.");
      }
      return { connected: status.connected, liveTradingEnabled: false };
    },

    async submitTrade(input) {
      assertPaperTradingSafe(deps.config);
      assertNeverActivatesLive();
      const operationId = createId();
      const quantity = input.signal.quantity;

      if (input.committee && !input.committee.approved) {
        const outcome = outcomeBase(
          operationId,
          input.pipelineId ?? null,
          "REJECTED_BY_COMMITTEE",
          input.committee.reasoning || "Committee rejected.",
          quantity,
        );
        await persistDecision(input, outcome);
        return outcome;
      }

      if (input.risk && (!input.risk.approved || input.risk.decision === "BLOCK" || input.risk.decision === "HALT_SYSTEM")) {
        const outcome = outcomeBase(
          operationId,
          input.pipelineId ?? null,
          "REJECTED_BY_RISK",
          input.risk.reason || "Risk engine rejected.",
          quantity,
        );
        await persistDecision(input, outcome);
        return outcome;
      }

      if (input.runtime && (!input.runtime.sessionOpen || !input.runtime.dataFresh || !input.runtime.brokerConnected)) {
        const outcome = outcomeBase(
          operationId,
          input.pipelineId ?? null,
          "REJECTED_BY_RUNTIME",
          "Market runtime gate blocked paper submission.",
          quantity,
        );
        await persistDecision(input, outcome);
        return outcome;
      }

      let effectiveQty = quantity;
      if (input.risk?.decision === "PASS_WITH_REDUCED_SIZE" && input.risk.reducedQuantity) {
        effectiveQty = Math.max(1, Math.min(quantity, input.risk.reducedQuantity));
      }

      if (deps.riskEvaluator) {
        const riskResult = await deps.riskEvaluator.evaluate({
          requestId: operationId,
          symbol: input.signal.symbol,
          quantity: effectiveQty,
          notional: effectiveQty * input.signal.market.expectedPrice,
          evaluatedAtUtc: input.nowUtc ?? now(),
        });
        if (riskResult.decision === "BLOCK" || riskResult.decision === "HALT_SYSTEM") {
          const outcome = outcomeBase(
            operationId,
            input.pipelineId ?? null,
            "REJECTED_BY_RISK",
            riskResult.explanation,
            effectiveQty,
          );
          await persistDecision(input, outcome);
          return outcome;
        }
      }

      const pipelineId = input.pipelineId ?? `paper-pipe-${operationId}`;
      const pipelineResult = await runPipeline(input.signal, pipelineId);
      if (pipelineResult.finalState !== "PAPER_SUBMITTED" && pipelineResult.finalState !== "APPROVED_FOR_PAPER") {
        if (pipelineResult.finalState === "REJECTED") {
          const outcome = outcomeBase(
            operationId,
            pipelineId,
            "REJECTED_BY_RISK",
            pipelineResult.transitions.at(-1)?.reason ?? "Execution pipeline rejected.",
            effectiveQty,
          );
          await persistDecision(input, outcome);
          return outcome;
        }
      }

      const decisionTime = input.signal.decisionTime ?? now();
      const sendTime = input.signal.sendTime ?? now();
      const order = await deps.brokerPort.createOrder({
        signal: {
          signalId: input.signal.signalId,
          strategy: input.signal.strategy,
          thesis: input.signal.thesis,
          brain: input.brain ?? null,
          committee: input.committee ?? null,
          risk: input.risk ?? null,
          pipelineId,
          pipelineState: pipelineResult.finalState,
        },
        symbol: input.signal.symbol,
        side: input.signal.side,
        intent: input.signal.intent,
        quantity: effectiveQty,
        currency: input.signal.currency ?? "USD",
        exchange: input.signal.exchange ?? "SMART",
        decisionTime,
        sendTime,
        bid: input.signal.market.bid,
        ask: input.signal.market.ask,
        expectedPrice: input.signal.market.expectedPrice,
        sessionTag: input.signal.sessionTag,
        regimeTag: input.signal.regimeTag,
        trailingOffset: input.signal.trailingOffset ?? null,
      });

      await deps.brokerPort.applyEvent(order.id, { type: "decision", decisionTime });
      const sent = await deps.brokerPort.applyEvent(order.id, { type: "send", sendTime });

      const outcome = fromOrder(
        operationId,
        pipelineId,
        sent.order,
        "PAPER_SUBMITTED",
        "Paper order submitted via BrokerEngine paper path.",
      );
      await persistDecision(input, outcome);
      return outcome;
    },

    async decisionAndSend(orderId, times) {
      assertNeverActivatesLive();
      await deps.brokerPort.applyEvent(orderId, {
        type: "decision",
        decisionTime: times?.decisionTime ?? now(),
      });
      const result = await deps.brokerPort.applyEvent(orderId, {
        type: "send",
        sendTime: times?.sendTime ?? now(),
      });
      return result.order;
    },

    async fill(orderId, args) {
      assertNeverActivatesLive();
      const result = await deps.brokerPort.applyEvent(orderId, {
        type: "fill",
        price: args.price,
        quantity: args.quantity,
        commission: args.commission ?? 0,
        reason: args.reason,
        at: args.at,
      });
      return result.order;
    },

    async cancel(orderId, reason = "manual_cancel") {
      assertNeverActivatesLive();
      const result = await deps.brokerPort.applyEvent(orderId, { type: "cancel", reason });
      return result.order;
    },

    async reject(orderId, reason = "broker_rejection") {
      assertNeverActivatesLive();
      const result = await deps.brokerPort.applyEvent(orderId, { type: "reject", reason });
      return result.order;
    },

    async expire(orderId, reason = "order_expired") {
      assertNeverActivatesLive();
      const result = await deps.brokerPort.applyEvent(orderId, { type: "expire", reason });
      return result.order;
    },

    async mark(orderId, markPrice) {
      assertNeverActivatesLive();
      const result = await deps.brokerPort.applyEvent(orderId, { type: "mark", markPrice });
      return result.order;
    },

    async updateTrailing(orderId, trailingOffset) {
      assertNeverActivatesLive();
      const result = await deps.brokerPort.applyEvent(orderId, { type: "update_trailing", trailingOffset });
      return result.order;
    },

    async triggerStop(orderId, price) {
      assertNeverActivatesLive();
      const result = await deps.brokerPort.applyEvent(orderId, {
        type: "fill",
        price,
        reason: "stop_triggered",
      });
      return result.order;
    },

    async triggerTakeProfit(orderId, price) {
      assertNeverActivatesLive();
      const result = await deps.brokerPort.applyEvent(orderId, {
        type: "fill",
        price,
        reason: "take_profit_triggered",
      });
      return result.order;
    },

    async getCertificationReport() {
      assertPaperTradingSafe(deps.config);
      const state = await deps.brokerPort.getState();
      return buildInstitutionalCertificationReport({
        closedTrades: state.closedTrades,
        orders: state.orders,
        windowDays: deps.config.certificationWindowDays,
        minimumClosedTrades: deps.config.minimumClosedTrades,
        riskFreeRate: deps.config.riskFreeRate,
        startingEquity: deps.config.startingEquity,
      });
    },

    async getPerformanceReport() {
      assertPaperTradingSafe(deps.config);
      const state = await deps.brokerPort.getState();
      return buildPerformanceReport({
        state,
        startingEquity: deps.config.startingEquity,
        riskFreeRate: deps.config.riskFreeRate,
      });
    },

    async getDashboardModel() {
      assertPaperTradingSafe(deps.config);
      assertNeverActivatesLive();
      const state = await deps.brokerPort.getState();
      const certification = buildInstitutionalCertificationReport({
        closedTrades: state.closedTrades,
        orders: state.orders,
        windowDays: deps.config.certificationWindowDays,
        minimumClosedTrades: deps.config.minimumClosedTrades,
        riskFreeRate: deps.config.riskFreeRate,
        startingEquity: deps.config.startingEquity,
      });
      const performance = buildPerformanceReport({
        state,
        startingEquity: deps.config.startingEquity,
        riskFreeRate: deps.config.riskFreeRate,
      });
      return {
        safety: {
          tradingMode: process.env.TRADING_MODE ?? "paper",
          liveTradingEnabled: process.env.LIVE_TRADING_ENABLED === "true",
          analysisOnlyUi: deps.config.analysisOnlyUi,
          simulatedOnly: true,
        },
        connected: state.connected,
        openOrders: state.orders.filter(
          (order) => !["FILLED", "CANCELED", "REJECTED", "EXPIRED", "REPLACED"].includes(order.status),
        ),
        positions: state.positions,
        recentTrades: state.closedTrades.slice(0, 50),
        journal: state.journal.slice(0, 50).map((entry) => ({ type: entry.type, at: entry.at })),
        certification,
        performance,
      };
    },
  };
}

export function createDefaultPaperTradingOrchestrator(args: {
  readonly brokerEngine: BrokerEngine;
  readonly config?: PaperTradingConfig;
  readonly memoryService?: PaperTradingOrchestratorDeps["memoryService"];
}): PaperTradingOrchestrator {
  return createPaperTradingOrchestrator({
    config: args.config ?? createPaperTradingConfigFromEnv(),
    brokerPort: createBrokerPaperPort(args.brokerEngine),
    memoryService: args.memoryService,
  });
}
