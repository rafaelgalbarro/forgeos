import "server-only";

import fs from "fs";
import path from "path";
import type {
  ApprovalToken,
  AuditEntry,
  BrokerOrderDraft,
  LiveExecutionOperation,
} from "./domain";
import type { WhatIfAnalyzer } from "./application";
import { estimateWhatIfFromDraft } from "./application";
import { InMemoryExecutionStorage } from "./memory-storage";

interface LiveExecutionStoreFile {
  readonly drafts: BrokerOrderDraft[];
  readonly approvals: ApprovalToken[];
  readonly operations: LiveExecutionOperation[];
  readonly audit: AuditEntry[];
}

export { InMemoryExecutionStorage };

export class FileExecutionStorage extends InMemoryExecutionStorage {
  constructor(private readonly filePath: string) {
    super();
    this.recoverFromFile();
  }

  override async saveDraft(draft: BrokerOrderDraft): Promise<void> {
    await super.saveDraft(draft);
    this.flush();
  }

  override async saveApproval(token: ApprovalToken): Promise<void> {
    await super.saveApproval(token);
    this.flush();
  }

  override async saveOperation(operation: LiveExecutionOperation): Promise<void> {
    await super.saveOperation(operation);
    this.flush();
  }

  override async appendAudit(entry: AuditEntry): Promise<void> {
    await super.appendAudit(entry);
    this.flush();
  }

  override async closeAllOpenOperations(reason: string, now: string): Promise<void> {
    await super.closeAllOpenOperations(reason, now);
    this.flush();
  }

  private recoverFromFile(): void {
    if (!fs.existsSync(this.filePath)) return;
    try {
      const raw = fs.readFileSync(this.filePath, "utf8").replace(/^\uFEFF/, "");
      if (!raw.trim()) return;
      const parsed = JSON.parse(raw) as LiveExecutionStoreFile;
      for (const draft of parsed.drafts ?? []) {
        void super.saveDraft(draft);
      }
      for (const approval of parsed.approvals ?? []) {
        void super.saveApproval(approval);
      }
      for (const operation of parsed.operations ?? []) {
        void super.saveOperation(operation);
      }
      for (const entry of parsed.audit ?? []) {
        void super.appendAudit(entry);
      }
    } catch {
      // ignore malformed persisted file; storage falls back to empty
    }
  }

  private flush(): void {
    const dir = path.dirname(this.filePath);
    fs.mkdirSync(dir, { recursive: true });
    void Promise.all([
      this.listAudit(),
      this.listOpenOperations(),
      this.listPendingApprovals("9999-12-31T23:59:59.999Z"),
    ]).then(async ([audit, openOperations, approvals]) => {
      const drafts = await Promise.all(openOperations.map((item) => this.getDraft(item.draft.draftId)));
      const file: LiveExecutionStoreFile = {
        drafts: drafts.filter((item): item is BrokerOrderDraft => Boolean(item)),
        approvals,
        operations: openOperations,
        audit,
      };
      const tmp = `${this.filePath}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify(file, null, 2), "utf8");
      fs.renameSync(tmp, this.filePath);
    });
  }
}

export class DeterministicWhatIfAnalyzer implements WhatIfAnalyzer {
  async runWhatIf(draft: BrokerOrderDraft) {
    return estimateWhatIfFromDraft(draft);
  }
}

export function defaultLiveExecutionStorePath(rootDir = process.cwd()): string {
  return path.join(rootDir, ".forgeos", "v2-store", "live-execution-v1.json");
}
