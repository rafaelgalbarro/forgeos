import type {
  ApprovalToken,
  AuditEntry,
  BrokerOrderDraft,
  LiveExecutionOperation,
} from "./domain";
import type { ExecutionStorage } from "./application";

export class InMemoryExecutionStorage implements ExecutionStorage {
  private drafts = new Map<string, BrokerOrderDraft>();
  private approvals = new Map<string, ApprovalToken>();
  private operations = new Map<string, LiveExecutionOperation>();
  private operationsByIdempotency = new Map<string, string>();
  private audit: AuditEntry[] = [];

  async saveDraft(draft: BrokerOrderDraft): Promise<void> {
    this.drafts.set(draft.draftId, draft);
  }

  async getDraft(draftId: string): Promise<BrokerOrderDraft | undefined> {
    return this.drafts.get(draftId);
  }

  async saveApproval(token: ApprovalToken): Promise<void> {
    this.approvals.set(token.approvalId, token);
  }

  async getApproval(approvalId: string): Promise<ApprovalToken | undefined> {
    return this.approvals.get(approvalId);
  }

  async saveOperation(operation: LiveExecutionOperation): Promise<void> {
    this.operations.set(operation.operationId, operation);
    this.operationsByIdempotency.set(operation.draft.idempotencyKey, operation.operationId);
  }

  async findOperationByIdempotencyKey(idempotencyKey: string): Promise<LiveExecutionOperation | undefined> {
    const operationId = this.operationsByIdempotency.get(idempotencyKey);
    return operationId ? this.operations.get(operationId) : undefined;
  }

  async listPendingApprovals(now: string): Promise<ApprovalToken[]> {
    return [...this.approvals.values()].filter((item) => item.expiresAt > now && !item.secondConfirmedAt);
  }

  async appendAudit(entry: AuditEntry): Promise<void> {
    this.audit.push(entry);
  }

  async listAudit(operationId?: string): Promise<AuditEntry[]> {
    const list = operationId ? this.audit.filter((item) => item.operationId === operationId) : this.audit;
    return [...list].sort((a, b) => a.at.localeCompare(b.at));
  }

  async listOpenOperations(): Promise<LiveExecutionOperation[]> {
    return [...this.operations.values()].filter((item) => item.state !== "CANCELLED");
  }

  async closeAllOpenOperations(_reason: string, _now: string): Promise<void> {
    for (const [operationId, operation] of this.operations.entries()) {
      this.operations.set(operationId, { ...operation, state: "CANCELLED" });
    }
  }
}
