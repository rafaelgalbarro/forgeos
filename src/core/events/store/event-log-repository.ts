/**
 * PROGRAM 6040 — Event log repository (NOT full event sourcing).
 * Source of truth remains domain aggregates; event log is audit/timeline/debug/partial recovery.
 */

import type { DomainEventEnvelope } from "../envelope";

export interface EventLogQuery {
  readonly workspaceId?: string;
  readonly missionId?: string;
  readonly aggregateType?: string;
  readonly aggregateId?: string;
  readonly eventType?: string;
  readonly correlationId?: string;
  readonly catalogKind?: string;
  readonly afterOccurredAt?: string;
  readonly beforeOccurredAt?: string;
  readonly limit?: number;
  readonly offset?: number;
}

export interface EventLogRepository {
  append(event: DomainEventEnvelope): Promise<DomainEventEnvelope>;
  appendMany(events: readonly DomainEventEnvelope[]): Promise<DomainEventEnvelope[]>;
  getById(eventId: string): Promise<DomainEventEnvelope | null>;
  query(query?: EventLogQuery): Promise<DomainEventEnvelope[]>;
  count(query?: EventLogQuery): Promise<number>;
  clear(): Promise<void>;
}

function matches(event: DomainEventEnvelope, query: EventLogQuery = {}): boolean {
  if (query.workspaceId && String(event.workspaceId) !== query.workspaceId) return false;
  if (query.missionId && String(event.missionId ?? "") !== query.missionId) return false;
  if (query.aggregateType && event.aggregateType !== query.aggregateType) return false;
  if (query.aggregateId && event.aggregateId !== query.aggregateId) return false;
  if (query.eventType && event.eventType !== query.eventType) return false;
  if (query.correlationId && event.correlationId !== query.correlationId) return false;
  if (query.catalogKind && event.catalogKind !== query.catalogKind) return false;
  if (query.afterOccurredAt && event.occurredAt <= query.afterOccurredAt) return false;
  if (query.beforeOccurredAt && event.occurredAt >= query.beforeOccurredAt) return false;
  return true;
}

export function createMemoryEventLog(maxEntries = 10_000): EventLogRepository {
  const entries: DomainEventEnvelope[] = [];

  return {
    async append(event) {
      entries.push(event);
      if (entries.length > maxEntries) {
        entries.splice(0, entries.length - maxEntries);
      }
      return event;
    },
    async appendMany(events) {
      const out: DomainEventEnvelope[] = [];
      for (const e of events) {
        out.push(await this.append(e));
      }
      return out;
    },
    async getById(eventId) {
      return entries.find((e) => String(e.eventId) === eventId) ?? null;
    },
    async query(query = {}) {
      const filtered = entries.filter((e) => matches(e, query));
      const offset = query.offset ?? 0;
      const limit = query.limit ?? filtered.length;
      return filtered.slice(offset, offset + limit);
    },
    async count(query = {}) {
      return entries.filter((e) => matches(e, query)).length;
    },
    async clear() {
      entries.length = 0;
    },
  };
}

const LS_KEY = "forgeos-event-log-v1";

export function createLocalStorageEventLog(
  storageKey = LS_KEY,
  maxEntries = 2_000
): EventLogRepository {
  function readAll(): DomainEventEnvelope[] {
    if (typeof localStorage === "undefined") return [];
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return [];
      return JSON.parse(raw) as DomainEventEnvelope[];
    } catch {
      return [];
    }
  }

  function writeAll(events: DomainEventEnvelope[]): void {
    if (typeof localStorage === "undefined") return;
    const trimmed = events.slice(-maxEntries);
    localStorage.setItem(storageKey, JSON.stringify(trimmed));
  }

  const memory = createMemoryEventLog(maxEntries);
  const existing = readAll();
  void memory.appendMany(existing);

  return {
    async append(event) {
      const saved = await memory.append(event);
      writeAll(await memory.query({}));
      return saved;
    },
    async appendMany(events) {
      const saved = await memory.appendMany(events);
      writeAll(await memory.query({}));
      return saved;
    },
    getById: (id) => memory.getById(id),
    query: (q) => memory.query(q),
    count: (q) => memory.count(q),
    async clear() {
      await memory.clear();
      if (typeof localStorage !== "undefined") localStorage.removeItem(storageKey);
    },
  };
}

/** Optional file-backed log for Node tests / local tooling */
export function createFileEventLog(
  filePath: string,
  fsApi: {
    readFileSync: (path: string, encoding: string) => string;
    writeFileSync: (path: string, data: string, encoding: string) => void;
    existsSync: (path: string) => boolean;
  },
  maxEntries = 10_000
): EventLogRepository {
  function readAll(): DomainEventEnvelope[] {
    try {
      if (!fsApi.existsSync(filePath)) return [];
      const raw = fsApi.readFileSync(filePath, "utf8");
      if (!raw.trim()) return [];
      return JSON.parse(raw) as DomainEventEnvelope[];
    } catch {
      return [];
    }
  }

  function writeAll(events: DomainEventEnvelope[]): void {
    fsApi.writeFileSync(filePath, JSON.stringify(events.slice(-maxEntries), null, 2), "utf8");
  }

  const memory = createMemoryEventLog(maxEntries);
  void memory.appendMany(readAll());

  return {
    async append(event) {
      const saved = await memory.append(event);
      writeAll(await memory.query({}));
      return saved;
    },
    async appendMany(events) {
      const saved = await memory.appendMany(events);
      writeAll(await memory.query({}));
      return saved;
    },
    getById: (id) => memory.getById(id),
    query: (q) => memory.query(q),
    count: (q) => memory.count(q),
    async clear() {
      await memory.clear();
      writeAll([]);
    },
  };
}
