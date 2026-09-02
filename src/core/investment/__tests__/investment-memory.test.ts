import fs from "fs";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it } from "vitest";
import {
  createInvestmentMemoryService,
  createInMemoryInvestmentMemoryRepository,
  serializeInvestmentMemory,
  summarizeInvestmentMemory,
} from "..";
import { createFileInvestmentMemoryRepository } from "../infrastructure/investment-memory-filesystem";

const createdDirs: string[] = [];

function testMemoryService() {
  let seq = 0;
  const repository = createInMemoryInvestmentMemoryRepository();
  const service = createInvestmentMemoryService({
    repository,
    now: () => "2026-07-30T09:30:00.000Z",
    createId: (kind) => {
      seq += 1;
      return `${kind}-${seq}`;
    },
  });
  return { service, repository };
}

afterEach(() => {
  for (const dir of createdDirs.splice(0, createdDirs.length)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

describe("Investment memory persistence and queries", () => {
  it("appends and queries all history record types", async () => {
    const { service } = testMemoryService();

    await service.recordMarket({
      occurredAt: "2026-07-30T09:00:00.000Z",
      provenance: { source: "market-feed" },
      indexes: { symbol: "NVDA", market: "NASDAQ" },
      payload: { price: 122.15, regime: "transition" },
    });
    await service.recordDecision({
      occurredAt: "2026-07-30T09:01:00.000Z",
      provenance: { source: "cio-agent", traceId: "c-1" },
      indexes: { symbol: "NVDA", strategy: "momentum", correlationId: "corr-1" },
      payload: { action: "BUY", confidence: 0.71 },
    });
    await service.recordAnalysis({
      occurredAt: "2026-07-30T09:01:30.000Z",
      provenance: { source: "analyst-ensemble" },
      indexes: { symbol: "NVDA", correlationId: "corr-1" },
      payload: { macro: "neutral", technical: "positive" },
    });
    await service.recordError({
      occurredAt: "2026-07-30T09:02:00.000Z",
      provenance: { source: "risk-engine" },
      indexes: { symbol: "NVDA", correlationId: "corr-1" },
      payload: { code: "SLIPPAGE_WARN", message: "Estimated slippage above threshold" },
    });
    await service.recordSimulatedOperation({
      occurredAt: "2026-07-30T09:02:30.000Z",
      provenance: { source: "simulator" },
      indexes: { symbol: "NVDA", scenario: "open-auction", correlationId: "corr-1" },
      payload: { side: "buy", size: 50, slippageBps: 12 },
    });
    await service.recordResult({
      occurredAt: "2026-07-30T09:03:00.000Z",
      provenance: { source: "post-trade-evaluator" },
      indexes: { symbol: "NVDA", correlationId: "corr-1" },
      payload: { pnlPct: 1.4, status: "simulated_success" },
    });

    const allDecisionRecords = await service.queryDecisionHistory();
    const errorRecords = await service.queryDecisionHistory({ kind: "error" });
    const marketRecords = await service.queryMarketHistory({ symbol: "NVDA" });

    expect(allDecisionRecords).toHaveLength(5);
    expect(errorRecords).toHaveLength(1);
    expect(errorRecords[0].kind).toBe("error");
    expect(marketRecords).toHaveLength(1);
    expect(marketRecords[0].indexes.market).toBe("NASDAQ");
  });

  it("round-trips persisted memory via file adapter", async () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "forgeos-investment-memory-"));
    createdDirs.push(dir);
    const filePath = path.join(dir, "investment-memory.json");

    let seq = 0;
    const writer = createInvestmentMemoryService({
      repository: createFileInvestmentMemoryRepository(filePath),
      now: () => "2026-07-30T10:00:00.000Z",
      createId: (kind) => {
        seq += 1;
        return `${kind}-${seq}`;
      },
    });

    await writer.recordDecision({
      occurredAt: "2026-07-30T09:01:00.000Z",
      provenance: { source: "cio-agent" },
      indexes: { symbol: "MSFT", correlationId: "corr-2" },
      payload: { action: "HOLD", confidence: 0.52 },
    });
    await writer.exportLearningDataset("2026-07-30T10:05:00.000Z");

    const reader = createInvestmentMemoryService({
      repository: createFileInvestmentMemoryRepository(filePath),
      now: () => "2026-07-30T10:10:00.000Z",
      createId: (kind) => `${kind}-reload`,
    });
    const reloaded = await reader.getMemory();

    expect(reloaded.decisionHistory.records).toHaveLength(1);
    expect(reloaded.learningDataset.examples).toHaveLength(1);
    expect(reloaded.learningDataset.exportedAt).toBe("2026-07-30T10:05:00.000Z");
  });

  it("keeps serialization auditable and deterministic", async () => {
    const { service } = testMemoryService();
    await service.recordDecision({
      occurredAt: "2026-07-30T09:10:00.000Z",
      provenance: { source: "cio-agent", tags: ["audit"] },
      indexes: { symbol: "SPY", market: "NYSE" },
      payload: { recommendation: "de-risk", confidence: 0.64, rationale: ["volatility rising"] },
    });

    const memory = await service.getMemory();
    const dto = serializeInvestmentMemory(memory);
    const summary = summarizeInvestmentMemory(memory);
    const parsed = JSON.parse(JSON.stringify(dto)) as typeof dto;

    expect(parsed.version).toBe(dto.version);
    expect(parsed.decisionHistory[0].source).toBe("cio-agent");
    expect(summary.totalDecisionRecords).toBe(1);
    expect(summary.totalErrors).toBe(0);
  });

  it("exports complete learning dataset without training side effects", async () => {
    const { service } = testMemoryService();
    await service.recordDecision({
      occurredAt: "2026-07-30T09:20:00.000Z",
      provenance: { source: "cio-agent" },
      indexes: { symbol: "QQQ", correlationId: "corr-3" },
      payload: { action: "BUY", confidence: 0.7 },
    });
    await service.recordAnalysis({
      occurredAt: "2026-07-30T09:20:30.000Z",
      provenance: { source: "analyst-ensemble" },
      indexes: { symbol: "QQQ", correlationId: "corr-3" },
      payload: { trend: "up", breadth: "mixed" },
    });
    await service.recordResult({
      occurredAt: "2026-07-30T09:21:00.000Z",
      provenance: { source: "evaluator" },
      indexes: { symbol: "QQQ", correlationId: "corr-3" },
      payload: { outcome: "profit", pnlPct: 2.2 },
    });
    await service.recordError({
      occurredAt: "2026-07-30T09:21:30.000Z",
      provenance: { source: "evaluator" },
      indexes: { symbol: "QQQ", correlationId: "corr-3" },
      payload: { code: "LATE_DATA", message: "One feed arrived late" },
    });
    await service.recordSimulatedOperation({
      occurredAt: "2026-07-30T09:21:45.000Z",
      provenance: { source: "simulator" },
      indexes: { symbol: "QQQ", correlationId: "corr-3" },
      payload: { size: 20, side: "buy" },
    });

    const dataset = await service.exportLearningDataset("2026-07-30T09:25:00.000Z");
    const trainResponse = await service.requestTraining();

    expect(dataset.examples).toHaveLength(1);
    expect(dataset.examples[0].decision).toBeTruthy();
    expect(dataset.examples[0].analysis).toBeTruthy();
    expect(dataset.examples[0].result).toBeTruthy();
    expect(dataset.examples[0].errors).toHaveLength(1);
    expect(dataset.examples[0].simulatedOperations).toHaveLength(1);
    expect(trainResponse.status).toBe("disabled");
  });
});
