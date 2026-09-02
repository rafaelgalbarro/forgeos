import type { InvestmentMemoryService } from "../application/investment-memory-service";
import type { SerializableValue } from "../domain";
import type {
  ShadowAuditRecord,
  ShadowEvaluationInput,
  ShadowEvaluationOutcome,
  ShadowTradingConfig,
} from "./domain";

export interface ShadowTradingService {
  evaluate(input: ShadowEvaluationInput): Promise<ShadowAuditRecord>;
}

export function createShadowTradingConfigFromEnv(flags = process.env): ShadowTradingConfig {
  const minimumDurationMs = Number(flags.SHADOW_MIN_DURATION_MS ?? 0);
  return {
    shadowMode: flags.SHADOW_MODE === "true",
    liveTradingEnabled: flags.LIVE_TRADING_ENABLED === "true",
    minimumDurationMs: Number.isFinite(minimumDurationMs) ? minimumDurationMs : 0,
  };
}

function assertShadowConfig(config: ShadowTradingConfig): void {
  if (!config.shadowMode) throw new Error("SHADOW_MODE must be true.");
  if (config.liveTradingEnabled) throw new Error("LIVE_TRADING_ENABLED must be false in shadow mode.");
  if (!Number.isFinite(config.minimumDurationMs) || config.minimumDurationMs < 0) {
    throw new Error("minimumDurationMs must be a number >= 0.");
  }
}

function basisPoints(from: number, to: number): number {
  if (from <= 0) return 0;
  return ((to - from) / from) * 10_000;
}

function computeAchievablePrice(input: ShadowEvaluationInput): number {
  const { side, expectedPrice } = input.signal;
  const { bid, ask, last, liquidityScore } = input.market;
  const referenceMid =
    typeof bid === "number" && typeof ask === "number" ? (bid + ask) / 2 : last;
  const impact = Math.max(0, (100 - liquidityScore) / 10_000);
  if (side === "BUY") return Math.max(expectedPrice, referenceMid * (1 + impact));
  return Math.min(expectedPrice, referenceMid * (1 - impact));
}

function computeFillStatus(input: ShadowEvaluationInput): "FILLED" | "PARTIAL" | "REJECTED" {
  if (!input.sessionOpen) return "REJECTED";
  if (input.market.missingData.length > 0) return "REJECTED";
  if (input.market.liquidityScore < 20) return "PARTIAL";
  return "FILLED";
}

function computeResult(pnl: number, status: "FILLED" | "PARTIAL" | "REJECTED"): ShadowEvaluationOutcome["result"] {
  if (status === "REJECTED") return "REJECTED";
  if (pnl > 0) return "SIMULATED_PROFIT";
  if (pnl < 0) return "SIMULATED_LOSS";
  return "SIMULATED_FLAT";
}

export function createShadowTradingService(input: {
  config: ShadowTradingConfig;
  memoryService: Pick<InvestmentMemoryService, "recordSimulatedOperation" | "recordResult" | "recordError">;
  now?: () => string;
}): ShadowTradingService {
  assertShadowConfig(input.config);
  const now = input.now ?? (() => new Date().toISOString());

  return {
    async evaluate(evaluationInput) {
      assertShadowConfig(input.config);
      const elapsedMs = Math.max(
        0,
        new Date(evaluationInput.nowUtc).getTime() -
          new Date(evaluationInput.signal.occurredAtUtc).getTime(),
      );
      if (elapsedMs < input.config.minimumDurationMs) {
        await input.memoryService.recordError({
          occurredAt: evaluationInput.nowUtc,
          provenance: { source: "shadow-trading", traceId: evaluationInput.signal.signalId },
          indexes: {
            symbol: evaluationInput.signal.symbol,
            strategy: evaluationInput.signal.strategy,
            correlationId: evaluationInput.signal.signalId,
          },
          payload: {
            mode: "shadow",
            reason: "minimum_duration_not_met",
            minimumDurationMs: input.config.minimumDurationMs,
            elapsedMs,
          },
        });
        throw new Error("Shadow evaluation rejected: minimum duration not reached.");
      }

      const achievablePrice = computeAchievablePrice(evaluationInput);
      const fillStatus = computeFillStatus(evaluationInput);
      const filledQuantity = fillStatus === "PARTIAL" ? Math.max(1, Math.floor(evaluationInput.signal.quantity / 2)) : fillStatus === "FILLED" ? evaluationInput.signal.quantity : 0;
      const fillPrice = fillStatus === "REJECTED" ? evaluationInput.signal.expectedPrice : achievablePrice;
      const slippageBps = basisPoints(evaluationInput.signal.expectedPrice, fillPrice);
      const signedQty = evaluationInput.signal.side === "BUY" ? filledQuantity : -filledQuantity;
      const estimatedPnl = (evaluationInput.market.last - fillPrice) * signedQty;
      const exposureChangePct =
        evaluationInput.portfolio.accountEquity > 0
          ? (Math.abs(fillPrice * filledQuantity) / evaluationInput.portfolio.accountEquity) * 100
          : 0;

      const outcome: ShadowEvaluationOutcome = {
        signalId: evaluationInput.signal.signalId,
        occurredAtUtc: evaluationInput.signal.occurredAtUtc,
        hypotheticalOrder: {
          orderId: `shadow-${evaluationInput.signal.signalId}`,
          symbol: evaluationInput.signal.symbol,
          side: evaluationInput.signal.side,
          quantity: evaluationInput.signal.quantity,
          expectedPrice: evaluationInput.signal.expectedPrice,
          achievablePrice,
          notional: achievablePrice * evaluationInput.signal.quantity,
        },
        simulatedFill: {
          status: fillStatus,
          fillPrice,
          filledQuantity,
          slippageBps,
        },
        result: computeResult(estimatedPnl, fillStatus),
        estimatedPnl,
        portfolioImpact: {
          exposureChangePct,
          cashDelta: -fillPrice * signedQty,
        },
        paperDifference: evaluationInput.paperReference
          ? {
              pnlDelta: estimatedPnl - evaluationInput.paperReference.simulatedPnl,
              slippageDeltaBps: slippageBps - evaluationInput.paperReference.simulatedSlippageBps,
              fillPriceDelta: fillPrice - evaluationInput.paperReference.simulatedFillPrice,
            }
          : null,
        rejectedSignals: fillStatus === "REJECTED" ? ["session_or_data_block"] : [],
        avoidedRisk: fillStatus === "REJECTED" ? ["real_order_send_avoided"] : [],
        latencyMs: evaluationInput.market.latencyMs,
        missingData: evaluationInput.market.missingData,
        decisionReasons: [evaluationInput.signal.reason],
      };

      await input.memoryService.recordSimulatedOperation({
        occurredAt: evaluationInput.nowUtc,
        provenance: { source: "shadow-trading", traceId: evaluationInput.signal.signalId },
        indexes: {
          symbol: evaluationInput.signal.symbol,
          strategy: evaluationInput.signal.strategy,
          correlationId: evaluationInput.signal.signalId,
        },
        payload: { mode: "shadow", ...outcome } as unknown as SerializableValue,
      });
      await input.memoryService.recordResult({
        occurredAt: evaluationInput.nowUtc,
        provenance: { source: "shadow-trading", traceId: evaluationInput.signal.signalId },
        indexes: {
          symbol: evaluationInput.signal.symbol,
          strategy: evaluationInput.signal.strategy,
          correlationId: evaluationInput.signal.signalId,
        },
        payload: {
          mode: "shadow",
          signalId: outcome.signalId,
          result: outcome.result,
          estimatedPnl: outcome.estimatedPnl,
          paperDifference: outcome.paperDifference,
          portfolioImpact: outcome.portfolioImpact,
        } as unknown as SerializableValue,
      });

      return {
        recordedAtUtc: now(),
        provenance: { source: "shadow-trading", traceId: evaluationInput.signal.signalId },
        outcome,
      };
    },
  };
}
