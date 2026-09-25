import {
  ensureInvestmentMemory,
  ensureLearningDataset,
  type AnalysisRecord,
  type DecisionHistoryRecord,
  type DecisionRecord,
  type ErrorRecord,
  type InvestmentMemory,
  type LearningDataset,
  type LearningDatasetExample,
  type MarketRecord,
  type MemoryIndexKeys,
  type MemoryProvenance,
  type ResultRecord,
  type SerializableValue,
  type SimulatedOperationRecord,
} from "../domain";
import type { InvestmentMemoryQuery, InvestmentMemoryRepository } from "../infrastructure";

export interface RecordMemoryInput<TPayload extends SerializableValue = SerializableValue> {
  readonly occurredAt: string;
  readonly provenance: MemoryProvenance;
  readonly indexes?: MemoryIndexKeys;
  readonly payload: TPayload;
}

export interface InvestmentMemoryService {
  getMemory(): Promise<InvestmentMemory>;
  recordDecision(input: RecordMemoryInput): Promise<DecisionRecord>;
  recordAnalysis(input: RecordMemoryInput): Promise<AnalysisRecord>;
  recordError(input: RecordMemoryInput): Promise<ErrorRecord>;
  recordSimulatedOperation(input: RecordMemoryInput): Promise<SimulatedOperationRecord>;
  recordResult(input: RecordMemoryInput): Promise<ResultRecord>;
  recordMarket(input: RecordMemoryInput): Promise<MarketRecord>;
  queryDecisionHistory(query?: InvestmentMemoryQuery): Promise<DecisionHistoryRecord[]>;
  queryMarketHistory(query?: InvestmentMemoryQuery): Promise<MarketRecord[]>;
  exportLearningDataset(exportedAt?: string): Promise<LearningDataset>;
  requestTraining(): Promise<{ status: "disabled"; reason: string }>;
}

interface ServiceDependencies {
  readonly repository: InvestmentMemoryRepository;
  readonly now?: () => string;
  readonly createId?: (kind: string) => string;
}

function orderByTimestamp<T extends { occurredAt: string; id: string }>(records: readonly T[]): T[] {
  return [...records].sort((a, b) => {
    if (a.occurredAt === b.occurredAt) return a.id.localeCompare(b.id);
    return a.occurredAt.localeCompare(b.occurredAt);
  });
}

function toDatasetExamples(records: readonly DecisionHistoryRecord[]): LearningDatasetExample[] {
  type MutableExample = {
    id: string;
    symbol?: string;
    market?: string;
    occurredAt: string;
    decision?: SerializableValue;
    analysis?: SerializableValue;
    result?: SerializableValue;
    errors: SerializableValue[];
    simulatedOperations: SerializableValue[];
    provenance: MemoryProvenance;
    version: number;
  };

  const grouped = new Map<string, MutableExample>();
  for (const record of orderByTimestamp(records)) {
    const key =
      record.indexes.correlationId ?? `${record.occurredAt}|${record.indexes.symbol ?? "unknown"}|${record.id}`;
    const current = grouped.get(key) ?? {
      id: key,
      symbol: record.indexes.symbol,
      market: record.indexes.market,
      occurredAt: record.occurredAt,
      errors: [],
      simulatedOperations: [],
      provenance: record.provenance,
      version: record.version,
    };

    if (record.kind === "decision") current.decision = record.payload;
    if (record.kind === "analysis") current.analysis = record.payload;
    if (record.kind === "result") current.result = record.payload;
    if (record.kind === "error") {
      current.errors = [...current.errors, record.payload];
    }
    if (record.kind === "simulated_operation") {
      current.simulatedOperations = [...current.simulatedOperations, record.payload];
    }

    grouped.set(key, current);
  }
  return orderByTimestamp(
    Array.from(grouped.values()).map(
      (example): LearningDatasetExample => ({
        ...example,
        errors: [...example.errors],
        simulatedOperations: [...example.simulatedOperations],
      }),
    ),
  );
}

async function appendRecord(
  deps: {
    repository: InvestmentMemoryRepository;
    now: () => string;
    createId: (kind: string) => string;
  },
  kind: DecisionHistoryRecord["kind"] | "market",
  input: RecordMemoryInput,
): Promise<DecisionHistoryRecord | MarketRecord> {
  const memory = await deps.repository.load();
  const nextVersion = memory.version + 1;
  const record =
    kind === "market"
      ? ({
          id: deps.createId(kind),
          kind: "market" as const,
          occurredAt: input.occurredAt,
          recordedAt: deps.now(),
          version: nextVersion,
          provenance: input.provenance,
          indexes: input.indexes ?? {},
          payload: input.payload,
        } satisfies MarketRecord)
      : ({
          id: deps.createId(kind),
          kind,
          occurredAt: input.occurredAt,
          recordedAt: deps.now(),
          version: nextVersion,
          provenance: input.provenance,
          indexes: input.indexes ?? {},
          payload: input.payload,
        } as DecisionHistoryRecord);

  const next: InvestmentMemory =
    kind === "market"
      ? {
          ...memory,
          version: nextVersion,
          updatedAt: deps.now(),
          marketHistory: {
            ...memory.marketHistory,
            records: [...memory.marketHistory.records, record as MarketRecord],
          },
        }
      : {
          ...memory,
          version: nextVersion,
          updatedAt: deps.now(),
          decisionHistory: {
            ...memory.decisionHistory,
            records: [...memory.decisionHistory.records, record as DecisionHistoryRecord],
          },
        };

  await deps.repository.save(ensureInvestmentMemory(next));
  return record as DecisionHistoryRecord | MarketRecord;
}

export function createInvestmentMemoryService(deps: ServiceDependencies): InvestmentMemoryService {
  const now = deps.now ?? (() => new Date().toISOString());
  const createId = deps.createId ?? ((kind: string) => `${kind}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`);

  return {
    async getMemory() {
      return ensureInvestmentMemory(await deps.repository.load());
    },
    async recordDecision(input) {
      return (await appendRecord({ repository: deps.repository, now, createId }, "decision", input)) as DecisionRecord;
    },
    async recordAnalysis(input) {
      return (await appendRecord({ repository: deps.repository, now, createId }, "analysis", input)) as AnalysisRecord;
    },
    async recordError(input) {
      return (await appendRecord({ repository: deps.repository, now, createId }, "error", input)) as ErrorRecord;
    },
    async recordSimulatedOperation(input) {
      return (await appendRecord(
        { repository: deps.repository, now, createId },
        "simulated_operation",
        input,
      )) as SimulatedOperationRecord;
    },
    async recordResult(input) {
      return (await appendRecord({ repository: deps.repository, now, createId }, "result", input)) as ResultRecord;
    },
    async recordMarket(input) {
      return (await appendRecord({ repository: deps.repository, now, createId }, "market", input)) as MarketRecord;
    },
    queryDecisionHistory(query) {
      return deps.repository.queryDecisionHistory(query);
    },
    queryMarketHistory(query) {
      return deps.repository.queryMarketHistory(query);
    },
    async exportLearningDataset(exportedAt = now()) {
      const memory = await deps.repository.load();
      const examples = toDatasetExamples(memory.decisionHistory.records);
      const dataset = ensureLearningDataset({
        version: memory.version,
        exportedAt,
        examples,
        exportMeta: {
          deterministicOrder: "occurredAt,id",
          sourceVersion: memory.version,
          totalRecords: memory.decisionHistory.records.length + memory.marketHistory.records.length,
        },
      });
      const nextMemory = ensureInvestmentMemory({
        ...memory,
        updatedAt: now(),
        learningDataset: dataset,
      });
      await deps.repository.save(nextMemory);
      return dataset;
    },
    async requestTraining() {
      return {
        status: "disabled",
        reason: "Investment memory only captures auditable records; model training is intentionally disabled.",
      };
    },
  };
}
