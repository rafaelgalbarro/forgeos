import type {
  ExecutionPipelineAggregate,
  ExecutionPipelineStage,
  StageArtifacts,
} from "./domain";
import type {
  AuditWriter,
  EventPublisher,
  IdempotencyStore,
  PipelineStateRepository,
  StageContext,
  StageEvaluator,
} from "./application";

export class InMemoryPipelineRepository implements PipelineStateRepository {
  private readonly store = new Map<string, ExecutionPipelineAggregate>();

  async getById(pipelineId: string): Promise<ExecutionPipelineAggregate | undefined> {
    return this.store.get(pipelineId);
  }

  async save(aggregate: ExecutionPipelineAggregate): Promise<void> {
    this.store.set(aggregate.pipelineId, aggregate);
  }
}

export class InMemoryIdempotencyStore implements IdempotencyStore {
  private readonly map = new Map<string, { at: string; value: unknown }>();

  async has(idempotencyKey: string): Promise<boolean> {
    return this.map.has(idempotencyKey);
  }

  async save(idempotencyKey: string, transition: unknown): Promise<void> {
    this.map.set(idempotencyKey, { at: new Date().toISOString(), value: transition });
  }

  async get(idempotencyKey: string): Promise<any> {
    return this.map.get(idempotencyKey)?.value;
  }
}

export class InMemoryEventPublisher implements EventPublisher {
  public readonly events: Array<{ name: string; payload: Readonly<Record<string, unknown>> }> = [];

  async publish(eventName: string, payload: Readonly<Record<string, unknown>>): Promise<void> {
    this.events.push({ name: eventName, payload });
  }
}

export class InMemoryAuditWriter implements AuditWriter {
  public readonly entries: Readonly<Record<string, unknown>>[] = [];

  async write(entry: Readonly<Record<string, unknown>>): Promise<void> {
    this.entries.push(entry);
  }
}

function fixedEvaluator<S extends ExecutionPipelineStage>(
  stage: S,
  artifact: StageArtifacts[S],
  passed = true,
  reason = `${stage} approved.`,
): StageEvaluator<S> {
  return {
    stage,
    async evaluate(_aggregate: Readonly<ExecutionPipelineAggregate>, _context: StageContext) {
      return { passed, reason, artifact };
    },
  };
}

export function createDefaultStageEvaluators(
  route: StageArtifacts["ApprovalPolicy"]["route"] = "PAPER",
): { [S in ExecutionPipelineStage]: StageEvaluator<S> } {
  return {
    OpportunityCandidate: fixedEvaluator("OpportunityCandidate", {
      symbol: "N/A",
      side: "BUY",
      confidence: 0.5,
      thesis: "Seed artifact only.",
    }),
    StrategyDecision: fixedEvaluator("StrategyDecision", {
      strategyId: "core-trend-v1",
      accepted: true,
      reasoning: "Strategy signal alignment above threshold.",
    }),
    InvestmentCommitteeDecision: fixedEvaluator("InvestmentCommitteeDecision", {
      approved: true,
      dissentingVotes: 0,
      reasoning: "Committee consensus reached.",
    }),
    PortfolioImpact: fixedEvaluator("PortfolioImpact", {
      expectedExposureChangePct: 2.4,
      concentrationImpactPct: 0.8,
    }),
    RiskDecision: fixedEvaluator("RiskDecision", {
      approved: true,
      level: "MEDIUM",
      monetaryRisk: 500,
      percentRisk: 0.9,
      reason: "Within portfolio max-risk budget.",
    }),
    LiquidityDecision: fixedEvaluator("LiquidityDecision", {
      approved: true,
      band: "DEEP",
      estimatedSlippageBps: 6,
    }),
    MarketSessionDecision: fixedEvaluator("MarketSessionDecision", {
      approved: true,
      session: "REGULAR",
      reason: "Primary session is open.",
    }),
    PreTradeCheck: fixedEvaluator("PreTradeCheck", {
      approved: true,
      checks: {
        KILL_SWITCH: "PASS",
        BUYING_POWER: "PASS",
        INSTRUMENT_ENABLED: "PASS",
      },
      reason: "All pre-trade checks passed.",
    }),
    ExecutionPlan: fixedEvaluator("ExecutionPlan", {
      quantity: 10,
      price: 100,
      stop: 95,
      target: 115,
      duration: "DAY",
      estimatedCost: 1.2,
      cancellationConditions: ["Spread exceeds 50 bps", "Signal confidence falls below 0.4"],
    }),
    ApprovalPolicy: fixedEvaluator("ApprovalPolicy", {
      route,
      policyVersion: "approval-policy-v1",
      reason: `Approved for ${route.toLowerCase()} route.`,
    }),
    BrokerOrderDraft: fixedEvaluator("BrokerOrderDraft", {
      venue: "PAPER_BROKER",
      tif: "DAY",
      brokerPayload: { type: "LIMIT", safety: "NO_LIVE_SUBMISSION" },
    }),
  };
}
