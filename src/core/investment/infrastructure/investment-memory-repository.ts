import {
  ensureInvestmentMemory,
  type DecisionHistoryRecord,
  type InvestmentMemory,
  type LearningDataset,
  type MarketRecord,
  type MemoryIndexKeys,
  type MemoryRecordKind,
} from "../domain";

/** Injectable filesystem surface for Node adapters (no direct `fs` import here). */
export type InvestmentMemoryFsApi = {
  existsSync: (targetPath: string) => boolean;
  mkdirSync: (targetPath: string, options: { recursive: true }) => void;
  readFileSync: (targetPath: string, encoding: "utf8") => string;
  writeFileSync: (targetPath: string, data: string, encoding: "utf8") => void;
  renameSync: (sourcePath: string, targetPath: string) => void;
};

function dirnameOf(filePath: string): string {
  const idx = Math.max(filePath.lastIndexOf("/"), filePath.lastIndexOf("\\"));
  return idx >= 0 ? filePath.slice(0, idx) : ".";
}

export interface InvestmentMemoryQuery {
  readonly kind?: MemoryRecordKind;
  readonly symbol?: string;
  readonly market?: string;
  readonly strategy?: string;
  readonly scenario?: string;
  readonly correlationId?: string;
  readonly afterOccurredAt?: string;
  readonly beforeOccurredAt?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface InvestmentMemoryRepository {
  load(): Promise<InvestmentMemory>;
  save(memory: InvestmentMemory): Promise<void>;
  clear(): Promise<void>;
  queryDecisionHistory(query?: InvestmentMemoryQuery): Promise<DecisionHistoryRecord[]>;
  queryMarketHistory(query?: InvestmentMemoryQuery): Promise<MarketRecord[]>;
}

function sortRecords<T extends { occurredAt: string; id: string }>(records: readonly T[]): T[] {
  return [...records].sort((a, b) => {
    if (a.occurredAt === b.occurredAt) return a.id.localeCompare(b.id);
    return a.occurredAt.localeCompare(b.occurredAt);
  });
}

function createEmptyMemory(now: string): InvestmentMemory {
  const emptyDataset: LearningDataset = {
    version: 1,
    exportedAt: now,
    examples: [],
    exportMeta: {
      deterministicOrder: "occurredAt,id",
      sourceVersion: 1,
      totalRecords: 0,
    },
  };
  return {
    version: 1,
    createdAt: now,
    updatedAt: now,
    decisionHistory: { version: 1, records: [] },
    marketHistory: { version: 1, records: [] },
    learningDataset: emptyDataset,
  };
}

function matchesIndexes(
  indexes: MemoryIndexKeys,
  query: InvestmentMemoryQuery,
): boolean {
  if (query.symbol && indexes.symbol !== query.symbol) return false;
  if (query.market && indexes.market !== query.market) return false;
  if (query.strategy && indexes.strategy !== query.strategy) return false;
  if (query.scenario && indexes.scenario !== query.scenario) return false;
  if (query.correlationId && indexes.correlationId !== query.correlationId) return false;
  return true;
}

function filterRecords<
  T extends { readonly id: string; kind: MemoryRecordKind; occurredAt: string; indexes: MemoryIndexKeys },
>(
  records: readonly T[],
  query: InvestmentMemoryQuery = {},
): T[] {
  const filtered = records.filter((record) => {
    if (query.kind && record.kind !== query.kind) return false;
    if (!matchesIndexes(record.indexes, query)) return false;
    if (query.afterOccurredAt && record.occurredAt <= query.afterOccurredAt) return false;
    if (query.beforeOccurredAt && record.occurredAt >= query.beforeOccurredAt) return false;
    return true;
  });
  const sorted = sortRecords(filtered);
  const offset = query.offset ?? 0;
  const limit = query.limit ?? sorted.length;
  return sorted.slice(offset, offset + limit);
}

export function createInMemoryInvestmentMemoryRepository(
  seed?: InvestmentMemory,
): InvestmentMemoryRepository {
  let memory = seed ? ensureInvestmentMemory(seed) : createEmptyMemory(new Date().toISOString());

  return {
    async load() {
      return memory;
    },
    async save(next) {
      memory = ensureInvestmentMemory(next);
    },
    async clear() {
      memory = createEmptyMemory(new Date().toISOString());
    },
    async queryDecisionHistory(query = {}) {
      return filterRecords(memory.decisionHistory.records, query);
    },
    async queryMarketHistory(query = {}) {
      return filterRecords(memory.marketHistory.records, query);
    },
  };
}

/**
 * File-backed repository using an injected fs API (no Node `fs` import in this module).
 * Prefer `createFileInvestmentMemoryRepository` from `./investment-memory-filesystem` in Node.
 */
export function createFileInvestmentMemoryRepository(
  filePath: string,
  fsApi: InvestmentMemoryFsApi,
): InvestmentMemoryRepository {
  function readFromDisk(): InvestmentMemory {
    try {
      if (!fsApi.existsSync(filePath)) {
        return createEmptyMemory(new Date().toISOString());
      }
      const raw = fsApi.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
      if (!raw.trim()) return createEmptyMemory(new Date().toISOString());
      return ensureInvestmentMemory(JSON.parse(raw) as InvestmentMemory);
    } catch {
      return createEmptyMemory(new Date().toISOString());
    }
  }

  function writeToDisk(memory: InvestmentMemory): void {
    const dir = dirnameOf(filePath);
    fsApi.mkdirSync(dir, { recursive: true });
    const tmpPath = `${filePath}.tmp`;
    const orderedMemory: InvestmentMemory = {
      ...memory,
      decisionHistory: {
        ...memory.decisionHistory,
        records: sortRecords(memory.decisionHistory.records),
      },
      marketHistory: {
        ...memory.marketHistory,
        records: sortRecords(memory.marketHistory.records),
      },
      learningDataset: {
        ...memory.learningDataset,
        examples: sortRecords(memory.learningDataset.examples),
      },
    };
    fsApi.writeFileSync(tmpPath, JSON.stringify(orderedMemory, null, 2), "utf8");
    fsApi.renameSync(tmpPath, filePath);
  }

  const memoryRepo = createInMemoryInvestmentMemoryRepository(readFromDisk());
  return {
    async load() {
      return memoryRepo.load();
    },
    async save(memory) {
      await memoryRepo.save(memory);
      writeToDisk(memory);
    },
    async clear() {
      await memoryRepo.clear();
      writeToDisk(await memoryRepo.load());
    },
    queryDecisionHistory: (query) => memoryRepo.queryDecisionHistory(query),
    queryMarketHistory: (query) => memoryRepo.queryMarketHistory(query),
  };
}
