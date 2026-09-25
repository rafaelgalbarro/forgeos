import "server-only";

import type {
  LiveRiskEvaluationResult,
  LiveRiskOverrideRequest,
} from "./domain";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

export interface LiveRiskAuditRecord {
  readonly requestId: string;
  readonly timestampUtc: string;
  readonly result: LiveRiskEvaluationResult;
}

export interface LiveRiskAuditStore {
  findByRequestId(requestId: string): Promise<LiveRiskAuditRecord | null>;
  write(record: LiveRiskAuditRecord): Promise<void>;
  writeOverride(request: LiveRiskOverrideRequest): Promise<void>;
}

export class InMemoryLiveRiskAuditStore implements LiveRiskAuditStore {
  private readonly byRequestId = new Map<string, LiveRiskAuditRecord>();
  private readonly overrides = new Map<string, LiveRiskOverrideRequest>();

  async findByRequestId(requestId: string): Promise<LiveRiskAuditRecord | null> {
    return this.byRequestId.get(requestId) ?? null;
  }

  async write(record: LiveRiskAuditRecord): Promise<void> {
    this.byRequestId.set(record.requestId, record);
  }

  async writeOverride(request: LiveRiskOverrideRequest): Promise<void> {
    this.overrides.set(request.overrideId, request);
  }
}

interface PersistedAuditEnvelope {
  readonly records: Record<string, LiveRiskAuditRecord>;
  readonly overrides: Record<string, LiveRiskOverrideRequest>;
}

const EMPTY_AUDIT_FILE: PersistedAuditEnvelope = {
  records: {},
  overrides: {},
};

export class FileLiveRiskAuditStore implements LiveRiskAuditStore {
  constructor(private readonly filePath: string) {}

  async findByRequestId(requestId: string): Promise<LiveRiskAuditRecord | null> {
    const data = await this.read();
    return data.records[requestId] ?? null;
  }

  async write(record: LiveRiskAuditRecord): Promise<void> {
    const data = await this.read();
    data.records[record.requestId] = record;
    await this.persist(data);
  }

  async writeOverride(request: LiveRiskOverrideRequest): Promise<void> {
    const data = await this.read();
    data.overrides[request.overrideId] = request;
    await this.persist(data);
  }

  private async read(): Promise<PersistedAuditEnvelope> {
    try {
      const content = await readFile(this.filePath, "utf8");
      return JSON.parse(content) as PersistedAuditEnvelope;
    } catch {
      return { ...EMPTY_AUDIT_FILE };
    }
  }

  private async persist(data: PersistedAuditEnvelope): Promise<void> {
    await mkdir(dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(data, null, 2), "utf8");
  }
}
