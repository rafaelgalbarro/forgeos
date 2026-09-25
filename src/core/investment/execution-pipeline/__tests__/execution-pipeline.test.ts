import { describe, expect, it } from "vitest";
import {
  ExecutionPipelineOrchestrator,
  InMemoryAuditWriter,
  InMemoryEventPublisher,
  InMemoryIdempotencyStore,
  InMemoryPipelineRepository,
  assertValidTransition,
  createDefaultStageEvaluators,
  toExecutionPipelineResultDto,
  type ExecutionPipelineStage,
} from "..";

function createSut(route: "SIMULATION" | "PAPER" | "LIVE" = "LIVE") {
  const repository = new InMemoryPipelineRepository();
  const idempotencyStore = new InMemoryIdempotencyStore();
  const eventPublisher = new InMemoryEventPublisher();
  const auditWriter = new InMemoryAuditWriter();
  const orchestrator = new ExecutionPipelineOrchestrator({
    repository,
    idempotencyStore,
    eventPublisher,
    auditWriter,
    stageEvaluators: createDefaultStageEvaluators(route),
    liveExecutionEnabled: false,
  });
  return { orchestrator, repository, idempotencyStore, eventPublisher, auditWriter };
}

describe("Execution pipeline", () => {
  it("enforces mandatory stage order and no skipping", async () => {
    const { orchestrator } = createSut("PAPER");
    const result = await orchestrator.run({
      pipelineId: "p-1",
      symbol: "MSFT",
      seedArtifact: {
        symbol: "MSFT",
        side: "BUY",
        confidence: 0.84,
        thesis: "Breakout and earnings support.",
      },
    });
    const traceStages = result.trace.map((t) => t.stage);
    const expected: ExecutionPipelineStage[] = [
      "OpportunityCandidate",
      "StrategyDecision",
      "InvestmentCommitteeDecision",
      "PortfolioImpact",
      "RiskDecision",
      "LiquidityDecision",
      "MarketSessionDecision",
      "PreTradeCheck",
      "ExecutionPlan",
      "ApprovalPolicy",
      "BrokerOrderDraft",
    ];
    expect(traceStages).toEqual(expected);
  });

  it("validates allowed and disallowed transitions", () => {
    expect(() => assertValidTransition("ANALYZING", "APPROVED_FOR_PAPER")).not.toThrow();
    expect(() => assertValidTransition("DETECTED", "APPROVED_FOR_PAPER")).toThrow(
      /Invalid transition/,
    );
  });

  it("replays transition idempotently", async () => {
    const { orchestrator, repository } = createSut("SIMULATION");
    await repository.save({
      pipelineId: "p-2",
      symbol: "NVDA",
      state: "APPROVED_FOR_SIMULATION",
      stages: [],
      transitions: [],
    });

    const first = await orchestrator.transition({
      pipelineId: "p-2",
      commandId: "cmd-sim-1",
      idempotencyKey: "idem-sim-1",
      expectedFrom: "APPROVED_FOR_SIMULATION",
      to: "SIMULATED",
      reason: "Run simulation.",
    });
    const second = await orchestrator.transition({
      pipelineId: "p-2",
      commandId: "cmd-sim-1-replayed",
      idempotencyKey: "idem-sim-1",
      expectedFrom: "APPROVED_FOR_SIMULATION",
      to: "SIMULATED",
      reason: "Replay should be ignored.",
    });
    expect(second).toEqual(first);
    const aggregate = await repository.getById("p-2");
    expect(aggregate?.transitions).toHaveLength(1);
  });

  it("calls persistence, event and audit on each transition", async () => {
    const { orchestrator, eventPublisher, auditWriter } = createSut("PAPER");
    const result = await orchestrator.run({
      pipelineId: "p-3",
      symbol: "AAPL",
      seedArtifact: {
        symbol: "AAPL",
        side: "BUY",
        confidence: 0.72,
        thesis: "Trend continuation.",
      },
    });
    expect(result.transitions.length).toBeGreaterThan(0);
    expect(eventPublisher.events).toHaveLength(result.transitions.length);
    expect(auditWriter.entries).toHaveLength(result.transitions.length);
  });

  it("blocks live submission by moving to LIVE_BLOCKED", async () => {
    const { orchestrator } = createSut("LIVE");
    const result = await orchestrator.run({
      pipelineId: "p-4",
      symbol: "TSLA",
      seedArtifact: {
        symbol: "TSLA",
        side: "BUY",
        confidence: 0.7,
        thesis: "Momentum and volume confirmation.",
      },
    });
    expect(result.finalState).toBe("LIVE_BLOCKED");
    expect(result.transitions.some((t) => t.to === "LIVE_SUBMITTED")).toBe(false);
  });

  it("returns complete explanation payload", async () => {
    const { orchestrator } = createSut("PAPER");
    const result = await orchestrator.run({
      pipelineId: "p-5",
      symbol: "AMZN",
      seedArtifact: {
        symbol: "AMZN",
        side: "BUY",
        confidence: 0.78,
        thesis: "Relative strength against sector.",
      },
    });
    const dto = toExecutionPipelineResultDto(result);
    expect(dto.explanation).toBeDefined();
    expect(Object.keys(dto.explanation ?? {}).sort()).toEqual(
      [
        "cancellationConditions",
        "duration",
        "estimatedCost",
        "liquidity",
        "marketSession",
        "monetaryRisk",
        "percentRisk",
        "portfolioImpact",
        "price",
        "quantity",
        "stop",
        "target",
        "whyEnter",
        "whyNotEnter",
      ].sort(),
    );
  });

  it("takes rejection path with mandatory reason", async () => {
    const base = createDefaultStageEvaluators("PAPER");
    const { orchestrator } = (() => {
      const repository = new InMemoryPipelineRepository();
      const idempotencyStore = new InMemoryIdempotencyStore();
      const eventPublisher = new InMemoryEventPublisher();
      const auditWriter = new InMemoryAuditWriter();
      return {
        orchestrator: new ExecutionPipelineOrchestrator({
          repository,
          idempotencyStore,
          eventPublisher,
          auditWriter,
          stageEvaluators: {
            ...base,
            RiskDecision: {
              stage: "RiskDecision",
              async evaluate() {
                return {
                  passed: false,
                  reason: "Risk breach on max drawdown budget.",
                  artifact: {
                    approved: false,
                    level: "HIGH",
                    monetaryRisk: 5000,
                    percentRisk: 5.5,
                    reason: "Rejected by risk budget.",
                  },
                };
              },
            },
          },
          liveExecutionEnabled: false,
        }),
      };
    })();

    const result = await orchestrator.run({
      pipelineId: "p-6",
      symbol: "NFLX",
      seedArtifact: {
        symbol: "NFLX",
        side: "BUY",
        confidence: 0.61,
        thesis: "Candidate exposed to risk rejection.",
      },
    });

    expect(result.finalState).toBe("REJECTED");
    expect(result.trace.find((x) => x.stage === "RiskDecision")?.passed).toBe(false);
  });

  it("blocks new entries when reconciliation is required", async () => {
    const repository = new InMemoryPipelineRepository();
    const idempotencyStore = new InMemoryIdempotencyStore();
    const eventPublisher = new InMemoryEventPublisher();
    const auditWriter = new InMemoryAuditWriter();
    const orchestrator = new ExecutionPipelineOrchestrator({
      repository,
      idempotencyStore,
      eventPublisher,
      auditWriter,
      stageEvaluators: createDefaultStageEvaluators("LIVE"),
      liveExecutionEnabled: true,
      entryGate: {
        async getEntryBlockStatus() {
          return {
            blocked: true,
            reason: "Reconciliation required before new entries.",
            status: "RECONCILIATION_REQUIRED" as const,
          };
        },
      },
    });

    const result = await orchestrator.run({
      pipelineId: "p-7",
      symbol: "META",
      seedArtifact: {
        symbol: "META",
        side: "BUY",
        confidence: 0.79,
        thesis: "Growth inflection setup.",
      },
    });

    expect(result.finalState).toBe("REJECTED");
    expect(result.trace.find((stage) => stage.stage === "PreTradeCheck")?.passed).toBe(false);
    expect(result.transitions[result.transitions.length - 1]?.to).toBe("REJECTED");
  });
});
