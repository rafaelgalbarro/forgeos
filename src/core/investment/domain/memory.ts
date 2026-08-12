import { assertNonEmpty, assertSerializable, type SerializableValue } from "./guards";

export type MemoryRecordKind =
  | "decision"
  | "analysis"
  | "error"
  | "simulated_operation"
  | "result"
  | "market";

export interface MemoryProvenance {
  readonly source: string;
  readonly actor?: string;
  readonly traceId?: string;
  readonly tags?: readonly string[];
}

export interface MemoryIndexKeys {
  readonly symbol?: string;
  readonly market?: string;
  readonly strategy?: string;
  readonly scenario?: string;
  readonly correlationId?: string;
}

export interface MemoryRecordBase<TPayload extends SerializableValue = SerializableValue> {
  readonly id: string;
  readonly kind: MemoryRecordKind;
  readonly occurredAt: string;
  readonly recordedAt: string;
  readonly version: number;
  readonly provenance: MemoryProvenance;
  readonly indexes: MemoryIndexKeys;
  readonly payload: TPayload;
}

export type DecisionRecord = MemoryRecordBase<SerializableValue> & { readonly kind: "decision" };
export type AnalysisRecord = MemoryRecordBase<SerializableValue> & { readonly kind: "analysis" };
export type ErrorRecord = MemoryRecordBase<SerializableValue> & { readonly kind: "error" };
export type SimulatedOperationRecord = MemoryRecordBase<SerializableValue> & {
  readonly kind: "simulated_operation";
};
export type ResultRecord = MemoryRecordBase<SerializableValue> & { readonly kind: "result" };
export type MarketRecord = MemoryRecordBase<SerializableValue> & { readonly kind: "market" };

export type DecisionHistoryRecord =
  | DecisionRecord
  | AnalysisRecord
  | ErrorRecord
  | SimulatedOperationRecord
  | ResultRecord;

export interface DecisionHistory {
  readonly version: number;
  readonly records: readonly DecisionHistoryRecord[];
}

export interface MarketHistory {
  readonly version: number;
  readonly records: readonly MarketRecord[];
}

export interface LearningDatasetExample {
  readonly id: string;
  readonly symbol?: string;
  readonly market?: string;
  readonly occurredAt: string;
  readonly decision?: SerializableValue;
  readonly analysis?: SerializableValue;
  readonly result?: SerializableValue;
  readonly errors: readonly SerializableValue[];
  readonly simulatedOperations: readonly SerializableValue[];
  readonly provenance: MemoryProvenance;
  readonly version: number;
}

export interface LearningDataset {
  readonly version: number;
  readonly exportedAt: string;
  readonly examples: readonly LearningDatasetExample[];
  readonly exportMeta: {
    readonly deterministicOrder: "occurredAt,id";
    readonly sourceVersion: number;
    readonly totalRecords: number;
  };
}

export interface InvestmentMemory {
  readonly version: number;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly decisionHistory: DecisionHistory;
  readonly marketHistory: MarketHistory;
  readonly learningDataset: LearningDataset;
}

function ensureBaseRecord(record: MemoryRecordBase): MemoryRecordBase {
  assertNonEmpty(record.id, "MemoryRecord.id");
  assertNonEmpty(record.occurredAt, "MemoryRecord.occurredAt");
  assertNonEmpty(record.recordedAt, "MemoryRecord.recordedAt");
  assertNonEmpty(record.provenance.source, "MemoryRecord.provenance.source");
  if (!Number.isInteger(record.version) || record.version < 1) {
    throw new Error("MemoryRecord.version must be an integer >= 1");
  }
  assertSerializable(record.indexes as SerializableValue, "MemoryRecord.indexes");
  assertSerializable(record.payload, "MemoryRecord.payload");
  return record;
}

export function ensureDecisionHistory(history: DecisionHistory): DecisionHistory {
  if (!Number.isInteger(history.version) || history.version < 1) {
    throw new Error("DecisionHistory.version must be an integer >= 1");
  }
  history.records.forEach((record) => ensureBaseRecord(record));
  return history;
}

export function ensureMarketHistory(history: MarketHistory): MarketHistory {
  if (!Number.isInteger(history.version) || history.version < 1) {
    throw new Error("MarketHistory.version must be an integer >= 1");
  }
  history.records.forEach((record) => ensureBaseRecord(record));
  return history;
}

export function ensureLearningDataset(dataset: LearningDataset): LearningDataset {
  if (!Number.isInteger(dataset.version) || dataset.version < 1) {
    throw new Error("LearningDataset.version must be an integer >= 1");
  }
  assertNonEmpty(dataset.exportedAt, "LearningDataset.exportedAt");
  dataset.examples.forEach((example) => {
    assertNonEmpty(example.id, "LearningDatasetExample.id");
    assertNonEmpty(example.occurredAt, "LearningDatasetExample.occurredAt");
    assertNonEmpty(example.provenance.source, "LearningDatasetExample.provenance.source");
    assertSerializable(example as unknown as SerializableValue, "LearningDatasetExample");
  });
  return dataset;
}

export function ensureInvestmentMemory(memory: InvestmentMemory): InvestmentMemory {
  if (!Number.isInteger(memory.version) || memory.version < 1) {
    throw new Error("InvestmentMemory.version must be an integer >= 1");
  }
  assertNonEmpty(memory.createdAt, "InvestmentMemory.createdAt");
  assertNonEmpty(memory.updatedAt, "InvestmentMemory.updatedAt");
  ensureDecisionHistory(memory.decisionHistory);
  ensureMarketHistory(memory.marketHistory);
  ensureLearningDataset(memory.learningDataset);
  assertSerializable(memory, "InvestmentMemory");
  return memory;
}
