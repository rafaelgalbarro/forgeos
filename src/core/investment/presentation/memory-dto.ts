import type { DecisionHistoryRecord, InvestmentMemory, MarketRecord } from "../domain";

export interface MemoryRecordDTO {
  readonly id: string;
  readonly kind: string;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly source: string;
  readonly indexes: Record<string, string | undefined>;
  readonly payload: unknown;
}

export interface InvestmentMemoryDTO {
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly decisionHistory: readonly MemoryRecordDTO[];
  readonly marketHistory: readonly MemoryRecordDTO[];
  readonly learningDataset: {
    readonly version: number;
    readonly exportedAt: string;
    readonly exampleCount: number;
    readonly sourceVersion: number;
  };
}

export interface InvestmentMemorySummaryDTO {
  readonly version: number;
  readonly updatedAt: string;
  readonly totalDecisionRecords: number;
  readonly totalMarketRecords: number;
  readonly totalErrors: number;
  readonly totalSimulatedOperations: number;
  readonly totalResults: number;
  readonly totalDatasetExamples: number;
}

function toRecordDTO(record: DecisionHistoryRecord | MarketRecord): MemoryRecordDTO {
  return {
    id: record.id,
    kind: record.kind,
    occurredAt: record.occurredAt,
    recordedAt: record.recordedAt,
    source: record.provenance.source,
    indexes: {
      symbol: record.indexes.symbol,
      market: record.indexes.market,
      strategy: record.indexes.strategy,
      scenario: record.indexes.scenario,
      correlationId: record.indexes.correlationId,
    },
    payload: record.payload,
  };
}

export function serializeInvestmentMemory(memory: InvestmentMemory): InvestmentMemoryDTO {
  return {
    version: memory.version,
    createdAt: memory.createdAt,
    updatedAt: memory.updatedAt,
    decisionHistory: memory.decisionHistory.records.map(toRecordDTO),
    marketHistory: memory.marketHistory.records.map(toRecordDTO),
    learningDataset: {
      version: memory.learningDataset.version,
      exportedAt: memory.learningDataset.exportedAt,
      exampleCount: memory.learningDataset.examples.length,
      sourceVersion: memory.learningDataset.exportMeta.sourceVersion,
    },
  };
}

export function summarizeInvestmentMemory(memory: InvestmentMemory): InvestmentMemorySummaryDTO {
  const totalErrors = memory.decisionHistory.records.filter((record) => record.kind === "error").length;
  const totalSimulatedOperations = memory.decisionHistory.records.filter(
    (record) => record.kind === "simulated_operation",
  ).length;
  const totalResults = memory.decisionHistory.records.filter((record) => record.kind === "result").length;

  return {
    version: memory.version,
    updatedAt: memory.updatedAt,
    totalDecisionRecords: memory.decisionHistory.records.length,
    totalMarketRecords: memory.marketHistory.records.length,
    totalErrors,
    totalSimulatedOperations,
    totalResults,
    totalDatasetExamples: memory.learningDataset.examples.length,
  };
}
