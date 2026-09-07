import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  DECISION_PIPELINE_ORDER_SURFACE,
  DECISION_PIPELINE_STAGES,
  DecisionPipelineOrchestrator,
  InMemoryAuditWriter,
  InMemoryDecisionPipelineRepository,
  InMemoryEventPublisher,
  InMemoryIdempotencyStore,
  assertStageOrder,
  assertValidTransition,
  buildReproducibilityKey,
  createStubStageEvaluators,
  deserializeDecision,
  hashInputs,
  serializeDecision,
  toDecisionPipelineResultDto,
  type DecisionPipelineStage,
} from "..";

function createSut(options?: {
  readonly warningsOnRisk?: boolean;
  readonly rejectAt?: DecisionPipelineStage;
  readonly insufficientAtMarket?: boolean;
  readonly now?: string;
}) {
  const repository = new InMemoryDecisionPipelineRepository();
  const idempotencyStore = new InMemoryIdempotencyStore();
  const eventPublisher = new InMemoryEventPublisher();
  const auditWriter = new InMemoryAuditWriter();
  const fixedNow = options?.now ?? "2026-07-30T12:00:00.000Z";
  let eventSeq = 0;
  const orchestrator = new DecisionPipelineOrchestrator({
    repository,
    idempotencyStore,
    eventPublisher,
    auditWriter,
    stageEvaluators: createStubStageEvaluators({
      warningsOnRisk: options?.warningsOnRisk,
      rejectAt: options?.rejectAt,
      insufficientAtMarket: options?.insufficientAtMarket,
    }),
    now: () => fixedNow,
    createEventId: () => `evt-${++eventSeq}`,
  });
  return { orchestrator, repository, idempotencyStore, eventPublisher, auditWriter };
}

const sampleInputs = {
  symbol: "MSFT",
  asOf: "2026-07-30",
  thesis: "Institutional hold review",
};

describe("Institutional decision pipeline", () => {
  it("enforces mandatory stage order and no skipping", async () => {
    const { orchestrator } = createSut();
    const result = await orchestrator.run({
      pipelineId: "dec-1",
      symbol: "MSFT",
      seed: "seed-1",
      inputs: sampleInputs,
    });
    expect(result.trace.map((t) => t.stage)).toEqual([...DECISION_PIPELINE_STAGES]);
    expect(() => assertStageOrder(["MarketSnapshot"], "Committee")).toThrow(/Stage order violation/);
    expect(() => assertStageOrder(["MarketSnapshot"], "InvestmentBrain")).not.toThrow();
  });

  it("validates allowed and disallowed states/transitions", () => {
    expect(() => assertValidTransition("PENDING", "ANALYZING")).not.toThrow();
    expect(() => assertValidTransition("ANALYZING", "WAITING_FOR_RESEARCH")).not.toThrow();
    expect(() => assertValidTransition("ANALYZING", "WAITING_FOR_RISK")).not.toThrow();
    expect(() => assertValidTransition("ANALYZING", "APPROVED")).not.toThrow();
    expect(() => assertValidTransition("PENDING", "APPROVED")).toThrow(/Invalid transition/);
    expect(() => assertValidTransition("REJECTED", "APPROVED")).toThrow(/Invalid transition/);
  });

  it("parks at research and risk waiting states before continuing", async () => {
    const { orchestrator } = createSut();
    const result = await orchestrator.run({
      pipelineId: "dec-wait",
      symbol: "AAPL",
      seed: "seed-wait",
      inputs: sampleInputs,
    });
    const path = result.transitions.map((t) => `${t.from}->${t.to}`);
    expect(path).toContain("ANALYZING->WAITING_FOR_RESEARCH");
    expect(path).toContain("WAITING_FOR_RESEARCH->ANALYZING");
    expect(path).toContain("ANALYZING->WAITING_FOR_RISK");
    expect(path).toContain("WAITING_FOR_RISK->ANALYZING");
    expect(result.finalState).toBe("APPROVED");
  });

  it("moves to INSUFFICIENT_DATA when market snapshot is insufficient", async () => {
    const { orchestrator } = createSut({ insufficientAtMarket: true });
    const result = await orchestrator.run({
      pipelineId: "dec-insuf",
      symbol: "IBM",
      seed: "seed-insuf",
      inputs: sampleInputs,
    });
    expect(result.finalState).toBe("INSUFFICIENT_DATA");
    expect(result.trace.map((t) => t.stage)).toEqual(["MarketSnapshot"]);
  });

  it("rejects when a mandatory stage fails", async () => {
    const { orchestrator } = createSut({ rejectAt: "Committee" });
    const result = await orchestrator.run({
      pipelineId: "dec-reject",
      symbol: "TSLA",
      seed: "seed-reject",
      inputs: sampleInputs,
    });
    expect(result.finalState).toBe("REJECTED");
    expect(result.trace.some((t) => t.stage === "Committee" && !t.passed)).toBe(true);
  });

  it("approves with warnings when risk raises warnings", async () => {
    const { orchestrator } = createSut({ warningsOnRisk: true });
    const result = await orchestrator.run({
      pipelineId: "dec-warn",
      symbol: "NVDA",
      seed: "seed-warn",
      inputs: sampleInputs,
    });
    expect(result.finalState).toBe("APPROVED_WITH_WARNINGS");
    expect(result.decision?.warnings.length).toBeGreaterThan(0);
  });

  it("keeps decisions versioned, serializable, explainable, and reproducible", async () => {
    const { orchestrator: a } = createSut();
    const { orchestrator: b } = createSut();
    const input = {
      pipelineId: "dec-repro-a",
      symbol: "MSFT",
      seed: "repro-seed",
      inputs: sampleInputs,
    };
    const first = await a.run(input);
    const second = await b.run({ ...input, pipelineId: "dec-repro-b" });

    expect(first.reproducibility.inputsHash).toBe(hashInputs(sampleInputs));
    expect(first.reproducibility.reproducibilityKey).toBe(
      buildReproducibilityKey(
        first.reproducibility.inputsHash,
        "repro-seed",
        first.reproducibility.schemaVersion,
      ),
    );
    expect(second.reproducibility).toEqual(first.reproducibility);
    expect(first.decision).toBeDefined();
    expect(first.version).toBeGreaterThan(1);

    const serialized = serializeDecision(first.decision!);
    const parsed = deserializeDecision(serialized);
    expect(parsed).toEqual(first.decision);
    expect(parsed.explanation.whyRecommend.length).toBeGreaterThan(0);
    expect(parsed.reproducibility.seed).toBe("repro-seed");
  });

  it("writes an audit trail for create, transitions, stages, and finalize", async () => {
    const { orchestrator, auditWriter, eventPublisher } = createSut();
    const result = await orchestrator.run({
      pipelineId: "dec-audit",
      symbol: "AMZN",
      seed: "seed-audit",
      inputs: sampleInputs,
    });
    expect(result.auditTrail.some((e) => e.kind === "DECISION_PIPELINE_CREATED")).toBe(true);
    expect(result.auditTrail.some((e) => e.kind === "DECISION_PIPELINE_TRANSITION")).toBe(true);
    expect(result.auditTrail.filter((e) => e.kind === "DECISION_PIPELINE_STAGE_COMPLETED")).toHaveLength(
      DECISION_PIPELINE_STAGES.length,
    );
    expect(result.auditTrail.some((e) => e.kind === "DECISION_PIPELINE_FINALIZED")).toBe(true);
    expect(auditWriter.entries.length).toBe(result.auditTrail.length);
    expect(eventPublisher.events.length).toBe(result.transitions.length);
    expect(eventPublisher.events.every((e) => e.name === "InvestmentDecisionPipelineTransitioned")).toBe(
      true,
    );
  });

  it("does not send orders and does not depend on broker runtime", async () => {
    expect(DECISION_PIPELINE_ORDER_SURFACE.sendsOrders).toBe(false);
    expect(DECISION_PIPELINE_ORDER_SURFACE.dependsOnBrokerRuntime).toBe(false);
    expect(DECISION_PIPELINE_ORDER_SURFACE.dependsOnBrokerGateway).toBe(false);
    expect(DECISION_PIPELINE_ORDER_SURFACE.analysisOnly).toBe(true);

    const root = join(__dirname, "..");
    const files = [
      "domain.ts",
      "application.ts",
      "infrastructure.ts",
      "presentation.ts",
      "index.ts",
    ];
    const forbiddenImport =
      /from\s+["'][^"']*(broker-engine|ibkr|live-execution)[^"']*["']/i;
    const forbiddenCall = /\b(placeOrder|submitOrder|sendOrder)\s*\(/;
    for (const file of files) {
      const source = readFileSync(join(root, file), "utf8");
      expect(source).not.toMatch(forbiddenImport);
      expect(source).not.toMatch(forbiddenCall);
      expect(source).not.toMatch(/\bLIVE_TRADING_ENABLED\b|\bANALYSIS_ONLY\b|\bIBKR_READ_ONLY\b/);
    }

    const { orchestrator } = createSut();
    const result = await orchestrator.run({
      pipelineId: "dec-no-orders",
      symbol: "META",
      seed: "seed-no-orders",
      inputs: sampleInputs,
    });
    const dto = toDecisionPipelineResultDto(result);
    const blob = JSON.stringify(dto);
    expect(blob).not.toMatch(/"orderId"|"brokerOrder"|"submitOrder"|"placeOrder"/i);
  });

  it("replays transitions idempotently", async () => {
    const { orchestrator, repository } = createSut();
    await repository.save({
      pipelineId: "dec-idem",
      symbol: "GOOG",
      schemaVersion: "1.0.0",
      version: 1,
      state: "ANALYZING",
      seed: "s",
      inputsHash: "h",
      reproducibilityKey: "r",
      createdAt: "2026-07-30T12:00:00.000Z",
      stages: [],
      transitions: [],
      auditTrail: [],
    });
    const first = await orchestrator.transition({
      pipelineId: "dec-idem",
      commandId: "cmd-1",
      idempotencyKey: "idem-1",
      expectedFrom: "ANALYZING",
      to: "WAITING_FOR_RESEARCH",
      reason: "park",
    });
    const second = await orchestrator.transition({
      pipelineId: "dec-idem",
      commandId: "cmd-1-replay",
      idempotencyKey: "idem-1",
      expectedFrom: "ANALYZING",
      to: "WAITING_FOR_RESEARCH",
      reason: "should ignore",
    });
    expect(second).toEqual(first);
    const aggregate = await repository.getById("dec-idem");
    expect(aggregate?.transitions).toHaveLength(1);
  });
});
