import {
  ChiefInvestmentOfficer,
  produceAllocationProposal,
  produceInvestmentDecision,
  produceRiskAssessment,
} from "../application";
import type { MarketSnapshot, PortfolioSnapshot, MarketSignal } from "../domain";
import type { InvestmentAgentResult } from "../domain/types";
import type { PortfolioAnalyticsService } from "../application/portfolio-analytics-service";
import type { InvestmentMemoryService } from "../application/investment-memory-service";
import type { MarketDataSource, PortfolioDataSource } from "../infrastructure/ports";
import type { SerializableValue } from "../domain/guards";
import {
  type DecisionPipelineAggregate,
  type DecisionPipelineStage,
  type DecisionPipelineTransition,
  type DecisionAuditEvent,
  type StageArtifacts,
} from "./domain";
import type {
  AuditWriter,
  DecisionPipelinePorts,
  EventPublisher,
  IdempotencyStore,
  PipelineStateRepository,
  StageContext,
  StageEvaluator,
  StageEvaluatorMap,
} from "./application";

export class InMemoryDecisionPipelineRepository implements PipelineStateRepository {
  private readonly store = new Map<string, DecisionPipelineAggregate>();

  async getById(pipelineId: string): Promise<DecisionPipelineAggregate | undefined> {
    return this.store.get(pipelineId);
  }

  async save(aggregate: DecisionPipelineAggregate): Promise<void> {
    this.store.set(aggregate.pipelineId, aggregate);
  }
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, DecisionPipelineTransition>();

  async has(idempotencyKey: string): Promise<boolean> {
    return this.map.has(idempotencyKey);
  }

  async save(idempotencyKey: string, transition: DecisionPipelineTransition): Promise<void> {
    this.map.set(idempotencyKey, transition);
  }

  async get(idempotencyKey: string): Promise<DecisionPipelineTransition | undefined> {
    return this.map.get(idempotencyKey);
  }
}

export class InMemoryEventPublisher implements EventPublisher {
  public readonly events: Array<{ name: string; payload: Readonly<Record<string, unknown>> }> = [];

  async publish(eventName: string, payload: Readonly<Record<string, unknown>>): Promise<void> {
    this.events.push({ name: eventName, payload });
  }
}

export class InMemoryAuditWriter implements AuditWriter {
  public readonly entries: DecisionAuditEvent[] = [];

  async write(entry: DecisionAuditEvent): Promise<void> {
    this.entries.push(entry);
  }
}

function fixedEvaluator<S extends DecisionPipelineStage>(
  stage: S,
  artifact: StageArtifacts[S],
  options?: {
    readonly passed?: boolean;
    readonly reason?: string;
    readonly warnings?: readonly string[];
    readonly insufficientData?: boolean;
  },
): StageEvaluator<S> {
  return {
    stage,
    async evaluate(_aggregate: Readonly<DecisionPipelineAggregate>, _context: StageContext) {
      return {
        passed: options?.passed ?? true,
        reason: options?.reason ?? `${stage} completed.`,
        artifact,
        warnings: options?.warnings ?? [],
        insufficientData: options?.insufficientData,
      };
    },
  };
}

const DEFAULT_SUBORDINATES: InvestmentAgentResult[] = [
  {
    agent: "Macro Analyst",
    score: { buy: 0.55, sell: 0.2, hold: 0.25 },
    confidence: 0.7,
    reasoning: "Macro backdrop supportive.",
    sources: ["macro"],
  },
  {
    agent: "Risk Manager",
    score: { buy: 0.35, sell: 0.25, hold: 0.4 },
    confidence: 0.8,
    reasoning: "Risk within policy.",
    sources: ["risk"],
  },
  {
    agent: "Portfolio Manager",
    score: { buy: 0.5, sell: 0.2, hold: 0.3 },
    confidence: 0.75,
    reasoning: "Fits portfolio mandate.",
    sources: ["portfolio"],
  },
];

/**
 * Default stub evaluators — analysis-only, no broker / order side effects.
 */
export function createStubStageEvaluators(options?: {
  readonly warningsOnRisk?: boolean;
  readonly rejectAt?: DecisionPipelineStage;
  readonly insufficientAtMarket?: boolean;
}): StageEvaluatorMap {
  const rejectAt = options?.rejectAt;
  const fail = (stage: DecisionPipelineStage) => rejectAt === stage;

  return {
    MarketSnapshot: fixedEvaluator(
      "MarketSnapshot",
      {
        capturedAt: "2026-07-30T12:00:00.000Z",
        regime: "sideways",
        volatilityIndex: 18,
        liquidityIndex: 72,
        breadthIndex: 55,
        macroSignals: ["rates-stable"],
        sources: ["static-market"],
        sufficient: !options?.insufficientAtMarket,
      },
      {
        passed: !options?.insufficientAtMarket,
        insufficientData: options?.insufficientAtMarket,
        reason: options?.insufficientAtMarket
          ? "Market snapshot missing required fields."
          : "Market snapshot captured.",
      },
    ),
    InvestmentBrain: fixedEvaluator(
      "InvestmentBrain",
      {
        recommendation: "hold",
        confidence: 0.62,
        reasoning: ["Signal bias neutral-to-positive."],
        risks: ["Concentration watch."],
        evidence: ["breadth 55", "liquidity 72"],
        usedSources: ["static-market"],
      },
      { passed: !fail("InvestmentBrain"), reason: fail("InvestmentBrain") ? "Brain rejected." : undefined },
    ),
    Committee: fixedEvaluator(
      "Committee",
      {
        consensus: "HOLD",
        confidence: 0.7,
        dissent: 0.15,
        buyScore: 0.45,
        sellScore: 0.2,
        holdScore: 0.35,
        minorityReport: [],
        approved: !fail("Committee"),
      },
      {
        passed: !fail("Committee"),
        reason: fail("Committee") ? "Committee dissent above threshold." : "Committee consensus reached.",
      },
    ),
    Research: fixedEvaluator(
      "Research",
      {
        researchId: "research-stub-1",
        thesis: "Mean-reversion opportunity within sector.",
        findings: ["Relative valuation attractive.", "No adverse news flow."],
        confidence: 0.68,
        sources: ["research-stub"],
        awaitingMore: false,
      },
      { passed: !fail("Research"), reason: fail("Research") ? "Research incomplete." : undefined },
    ),
    PortfolioAnalytics: fixedEvaluator(
      "PortfolioAnalytics",
      {
        asOf: "2026-07-30T12:00:00.000Z",
        concentrationPct: 22,
        volatilityPct: 14,
        sharpe: 0.85,
        totalRiskPct: 11,
        notes: ["Diversification adequate."],
      },
      {
        passed: !fail("PortfolioAnalytics"),
        reason: fail("PortfolioAnalytics") ? "Analytics failed." : undefined,
      },
    ),
    RiskEngine: fixedEvaluator(
      "RiskEngine",
      {
        level: options?.warningsOnRisk ? "medium" : "low",
        approved: !fail("RiskEngine"),
        warnings: options?.warningsOnRisk ? ["Elevated concentration vs peer book."] : [],
        concentrationRiskPct: options?.warningsOnRisk ? 28 : 18,
        liquidityRiskPct: 25,
        expectedDrawdownPct: 12,
        factors: ["VaR within budget.", "Liquidity score acceptable."],
        awaitingExternal: false,
      },
      {
        passed: !fail("RiskEngine"),
        warnings: options?.warningsOnRisk ? ["Elevated concentration vs peer book."] : [],
        reason: fail("RiskEngine") ? "Risk policy breach." : undefined,
      },
    ),
    AllocationEngine: fixedEvaluator(
      "AllocationEngine",
      {
        targetCashPct: 15,
        targetEquityPct: 70,
        targetDefensivePct: 15,
        adjustments: [
          {
            symbol: "CASH",
            action: "hold",
            deltaPct: 0,
            rationale: "Cash target aligned.",
          },
        ],
      },
      {
        passed: !fail("AllocationEngine"),
        reason: fail("AllocationEngine") ? "Allocation rejected." : undefined,
      },
    ),
    InvestmentDecision: fixedEvaluator(
      "InvestmentDecision",
      {
        recommendation: "hold",
        confidence: 0.64,
        reasoning: ["Committee hold consensus.", "Risk within policy.", "Research thesis intact."],
        risks: ["Concentration watch."],
        evidence: ["committee", "risk", "research"],
        usedSources: ["static-market", "research-stub"],
        warnings: options?.warningsOnRisk ? ["Elevated concentration vs peer book."] : [],
      },
      {
        passed: !fail("InvestmentDecision"),
        warnings: options?.warningsOnRisk ? ["Elevated concentration vs peer book."] : [],
        reason: fail("InvestmentDecision") ? "Decision blocked." : undefined,
      },
    ),
    InvestmentReport: fixedEvaluator(
      "InvestmentReport",
      {
        generatedAt: "2026-07-30T12:05:00.000Z",
        summary: "Institutional hold recommendation after full analytical pipeline.",
        recommendation: "hold",
        confidence: 0.64,
        riskLevel: options?.warningsOnRisk ? "medium" : "low",
        allocationSummary: "cash=15% equity=70% defensive=15%",
        sections: {
          market: "Sideways regime with adequate liquidity.",
          committee: "HOLD consensus.",
          research: "Mean-reversion thesis.",
          risk: "Within policy.",
        },
      },
      {
        passed: !fail("InvestmentReport"),
        reason: fail("InvestmentReport") ? "Report generation failed." : undefined,
      },
    ),
    Memory: fixedEvaluator(
      "Memory",
      {
        recorded: true,
        memoryRecordId: "mem-stub-1",
        correlationId: "corr-stub-1",
        note: "Decision persisted to investment memory (analysis-only).",
      },
      { passed: !fail("Memory"), reason: fail("Memory") ? "Memory write failed." : undefined },
    ),
  };
}

export interface WiredStageEvaluatorOptions {
  readonly marketSnapshot?: MarketSnapshot;
  readonly portfolioSnapshot?: PortfolioSnapshot;
  readonly signals?: readonly MarketSignal[];
  readonly subordinateResults?: readonly InvestmentAgentResult[];
  readonly marketDataSource?: MarketDataSource;
  readonly portfolioDataSource?: PortfolioDataSource;
  readonly portfolioAnalyticsService?: PortfolioAnalyticsService;
  readonly memoryService?: InvestmentMemoryService;
  readonly warningsOnRisk?: boolean;
}

/**
 * Stage evaluators that prefer live ports / existing domain functions, with safe stubs as fallback.
 * Analysis-only: no broker runtime coupling and no order placement side effects.
 */
export function createWiredStageEvaluators(options: WiredStageEvaluatorOptions = {}): StageEvaluatorMap {
  const stubs = createStubStageEvaluators({ warningsOnRisk: options.warningsOnRisk });
  const cio = new ChiefInvestmentOfficer();

  return {
    MarketSnapshot: {
      stage: "MarketSnapshot",
      async evaluate(_aggregate, context) {
        const snapshot =
          options.marketSnapshot ??
          (options.marketDataSource ? await options.marketDataSource.getMarketSnapshot() : null);
        if (!snapshot) {
          return stubs.MarketSnapshot.evaluate(_aggregate, context);
        }
        const sufficient =
          Number.isFinite(snapshot.volatilityIndex) &&
          Number.isFinite(snapshot.liquidityIndex) &&
          snapshot.sources.length > 0;
        return {
          passed: sufficient,
          insufficientData: !sufficient,
          reason: sufficient ? "Market snapshot captured from data source." : "Insufficient market data.",
          artifact: {
            capturedAt: snapshot.capturedAt,
            regime: snapshot.regime,
            volatilityIndex: snapshot.volatilityIndex,
            liquidityIndex: snapshot.liquidityIndex,
            breadthIndex: snapshot.breadthIndex,
            macroSignals: snapshot.macroSignals,
            sources: snapshot.sources,
            sufficient,
          },
        };
      },
    },
    InvestmentBrain: {
      stage: "InvestmentBrain",
      async evaluate(aggregate, context) {
        const market = options.marketSnapshot;
        const portfolio = options.portfolioSnapshot;
        const signals = options.signals;
        if (!market || !portfolio || !signals) {
          return stubs.InvestmentBrain.evaluate(aggregate, context);
        }
        const decision = produceInvestmentDecision({
          marketSnapshot: market,
          portfolioSnapshot: portfolio,
          signals,
        });
        return {
          passed: true,
          reason: "Investment brain produced recommendation.",
          artifact: {
            recommendation: decision.recommendation,
            confidence: decision.confidence,
            reasoning: decision.reasoning,
            risks: decision.risks,
            evidence: decision.evidence,
            usedSources: decision.usedSources,
          },
        };
      },
    },
    Committee: {
      stage: "Committee",
      async evaluate(aggregate, context) {
        const subordinates = options.subordinateResults ?? DEFAULT_SUBORDINATES;
        try {
          const committee = cio.aggregate([...subordinates]);
          return {
            passed: committee.confidence >= 0.4,
            reason: "Committee deliberation completed via CIO aggregate.",
            artifact: {
              consensus: committee.consensus,
              confidence: committee.confidence,
              dissent: committee.dissent,
              buyScore: committee.buy_score,
              sellScore: committee.sell_score,
              holdScore: committee.hold_score,
              minorityReport: committee.minority_report,
              approved: committee.confidence >= 0.4,
            },
          };
        } catch {
          return stubs.Committee.evaluate(aggregate, context);
        }
      },
    },
    Research: stubs.Research,
    PortfolioAnalytics: {
      stage: "PortfolioAnalytics",
      async evaluate(aggregate, context) {
        if (!options.portfolioAnalyticsService) {
          return stubs.PortfolioAnalytics.evaluate(aggregate, context);
        }
        const snap = await options.portfolioAnalyticsService.analyze();
        return {
          passed: true,
          reason: "Portfolio analytics computed.",
          artifact: {
            asOf: snap.asOf,
            concentrationPct: snap.concentration.value,
            volatilityPct: snap.volatility.value,
            sharpe: snap.sharpe.value,
            totalRiskPct: snap.totalRisk.value,
            notes: ["Wired portfolio analytics provider."],
          },
        };
      },
    },
    RiskEngine: {
      stage: "RiskEngine",
      async evaluate(aggregate, context) {
        const market = options.marketSnapshot;
        const portfolio = options.portfolioSnapshot;
        const signals = options.signals ?? [];
        if (!market || !portfolio) {
          return stubs.RiskEngine.evaluate(aggregate, context);
        }
        const assessment = produceRiskAssessment({
          marketSnapshot: market,
          portfolioSnapshot: portfolio,
          signals,
        });
        const warnings =
          assessment.level === "high" || assessment.level === "medium"
            ? [`Risk level ${assessment.level}.`]
            : options.warningsOnRisk
              ? ["Elevated concentration vs peer book."]
              : [];
        return {
          passed: assessment.level !== "high",
          reason:
            assessment.level === "high"
              ? "Risk engine rejected due to high risk."
              : "Risk engine assessment within policy.",
          warnings,
          artifact: {
            level: assessment.level,
            approved: assessment.level !== "high",
            warnings,
            concentrationRiskPct: assessment.concentrationRiskPct,
            liquidityRiskPct: assessment.liquidityRiskPct,
            expectedDrawdownPct: assessment.expectedDrawdownPct,
            factors: assessment.factors,
            awaitingExternal: false,
          },
        };
      },
    },
    AllocationEngine: {
      stage: "AllocationEngine",
      async evaluate(aggregate, context) {
        const market = options.marketSnapshot;
        const portfolio = options.portfolioSnapshot;
        const signals = options.signals ?? [];
        if (!market || !portfolio) {
          return stubs.AllocationEngine.evaluate(aggregate, context);
        }
        const proposal = produceAllocationProposal({
          marketSnapshot: market,
          portfolioSnapshot: portfolio,
          signals,
        });
        return {
          passed: true,
          reason: "Allocation proposal produced.",
          artifact: {
            targetCashPct: proposal.targetCashPct,
            targetEquityPct: proposal.targetEquityPct,
            targetDefensivePct: proposal.targetDefensivePct,
            adjustments: proposal.adjustments,
          },
        };
      },
    },
    InvestmentDecision: {
      stage: "InvestmentDecision",
      async evaluate(aggregate, context) {
        const market = options.marketSnapshot;
        const portfolio = options.portfolioSnapshot;
        const signals = options.signals;
        if (!market || !portfolio || !signals) {
          return stubs.InvestmentDecision.evaluate(aggregate, context);
        }
        const decision = produceInvestmentDecision({
          marketSnapshot: market,
          portfolioSnapshot: portfolio,
          signals,
        });
        const riskStage = aggregate.stages.find((s) => s.stage === "RiskEngine");
        const riskArtifact = riskStage?.artifact as StageArtifacts["RiskEngine"] | undefined;
        const warnings = [...(riskArtifact?.warnings ?? []), ...(riskStage?.warnings ?? [])];
        return {
          passed: true,
          reason: "Investment decision assembled from analytical stages.",
          warnings,
          artifact: {
            recommendation: decision.recommendation,
            confidence: decision.confidence,
            reasoning: decision.reasoning,
            risks: decision.risks,
            evidence: decision.evidence,
            usedSources: decision.usedSources,
            warnings,
          },
        };
      },
    },
    InvestmentReport: {
      stage: "InvestmentReport",
      async evaluate(aggregate, context) {
        const decision = aggregate.stages.find((s) => s.stage === "InvestmentDecision")
          ?.artifact as StageArtifacts["InvestmentDecision"] | undefined;
        const risk = aggregate.stages.find((s) => s.stage === "RiskEngine")
          ?.artifact as StageArtifacts["RiskEngine"] | undefined;
        const allocation = aggregate.stages.find((s) => s.stage === "AllocationEngine")
          ?.artifact as StageArtifacts["AllocationEngine"] | undefined;
        const research = aggregate.stages.find((s) => s.stage === "Research")
          ?.artifact as StageArtifacts["Research"] | undefined;
        const committee = aggregate.stages.find((s) => s.stage === "Committee")
          ?.artifact as StageArtifacts["Committee"] | undefined;

        return {
          passed: true,
          reason: "Investment report composed from stage artifacts.",
          artifact: {
            generatedAt: context.nowIso,
            summary: `Analytical decision ${decision?.recommendation ?? "n/a"} for ${aggregate.symbol}.`,
            recommendation: decision?.recommendation ?? "hold",
            confidence: decision?.confidence ?? 0,
            riskLevel: risk?.level ?? "n/a",
            allocationSummary: allocation
              ? `cash=${allocation.targetCashPct}% equity=${allocation.targetEquityPct}% defensive=${allocation.targetDefensivePct}%`
              : "n/a",
            sections: {
              committee: committee ? `${committee.consensus}` : "n/a",
              research: research?.thesis ?? "n/a",
              risk: risk?.level ?? "n/a",
              decision: decision?.recommendation ?? "n/a",
            },
          },
        };
      },
    },
    Memory: {
      stage: "Memory",
      async evaluate(aggregate, context) {
        if (!options.memoryService) {
          return stubs.Memory.evaluate(aggregate, context);
        }
        const committee = aggregate.stages.find((s) => s.stage === "Committee")
          ?.artifact as StageArtifacts["Committee"] | undefined;
        const decision = aggregate.stages.find((s) => s.stage === "InvestmentDecision")
          ?.artifact as StageArtifacts["InvestmentDecision"] | undefined;
        const report = aggregate.stages.find((s) => s.stage === "InvestmentReport")
          ?.artifact as StageArtifacts["InvestmentReport"] | undefined;
        const research = aggregate.stages.find((s) => s.stage === "Research")
          ?.artifact as StageArtifacts["Research"] | undefined;
        const risk = aggregate.stages.find((s) => s.stage === "RiskEngine")
          ?.artifact as StageArtifacts["RiskEngine"] | undefined;
        const brain = aggregate.stages.find((s) => s.stage === "InvestmentBrain")
          ?.artifact as StageArtifacts["InvestmentBrain"] | undefined;
        const allocation = aggregate.stages.find((s) => s.stage === "AllocationEngine")
          ?.artifact as StageArtifacts["AllocationEngine"] | undefined;
        const portfolioAnalytics = aggregate.stages.find((s) => s.stage === "PortfolioAnalytics")
          ?.artifact as StageArtifacts["PortfolioAnalytics"] | undefined;

        const record = await options.memoryService.recordDecision({
          occurredAt: context.nowIso,
          provenance: {
            source: "ForgeOS.Investment.DecisionPipeline",
            actor: "DecisionPipelineOrchestrator",
          },
          indexes: {
            symbol: aggregate.symbol,
            correlationId: aggregate.pipelineId,
          },
          payload: {
            pipelineId: aggregate.pipelineId,
            inputsHash: aggregate.inputsHash,
            reproducibilityKey: aggregate.reproducibilityKey,
            version: aggregate.version,
            brain: brain ?? null,
            committee: committee ?? null,
            decision: decision ?? null,
            research: research ?? null,
            risk: risk ?? null,
            allocation: allocation ?? null,
            portfolioAnalytics: portfolioAnalytics ?? null,
            recommendation:
              decision?.recommendation ?? report?.recommendation ?? brain?.recommendation ?? null,
            confidence: decision?.confidence ?? committee?.confidence ?? brain?.confidence ?? null,
            reasoning: decision?.reasoning ?? brain?.reasoning ?? [],
          } as unknown as SerializableValue,
        });
        return {
          passed: true,
          reason: "Decision recorded in investment memory.",
          artifact: {
            recorded: true,
            memoryRecordId: record.id,
            correlationId: aggregate.pipelineId,
            note: "Persisted via InvestmentMemoryService (analysis-only) with Brain/Committee/Research/Risk/Allocation/PortfolioAnalytics artifacts when available.",
          },
        };
      },
    },
  };
}

/**
 * Optional port bag for callers that want explicit adapter injection.
 * Does not expose order or broker APIs.
 */
export function createAnalysisOnlyPorts(partial: DecisionPipelinePorts = {}): DecisionPipelinePorts {
  return { ...partial };
}

/** Guard used by tests: this module must never reference order placement APIs. */
export const DECISION_PIPELINE_ORDER_SURFACE = Object.freeze({
  sendsOrders: false,
  dependsOnBrokerRuntime: false,
  dependsOnBrokerGateway: false,
  analysisOnly: true,
});
