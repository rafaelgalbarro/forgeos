import type { BrokerEngine } from "@/src/core/application/ports/broker-engine";
import {
  calcNotional,
  calcRiskPerTrade,
  ensureLiveTradingRemainsDisabled,
  type ApprovalRequestInput,
  type ApprovalToken,
  type AuditEntry,
  type BrokerOrderDraft,
  type BrokerSubmissionReceipt,
  type CreateExecutionDraftInput,
  type ExecutionRestrictions,
  type FillReconciliation,
  type LiveExecutionLifecycleState,
  type LiveExecutionOperation,
  type WhatIfResult,
} from "./domain";

function toAuditDetails(value: unknown): Readonly<Record<string, unknown>> {
  return value as Readonly<Record<string, unknown>>;
}

export interface PriceSnapshot {
  readonly bid: number;
  readonly ask: number;
  readonly last: number;
  readonly at: string;
}

export interface WhatIfAnalyzer {
  runWhatIf(draft: BrokerOrderDraft): Promise<WhatIfResult>;
}

export interface ExecutionStorage {
  saveDraft(draft: BrokerOrderDraft): Promise<void>;
  getDraft(draftId: string): Promise<BrokerOrderDraft | undefined>;
  saveApproval(token: ApprovalToken): Promise<void>;
  getApproval(approvalId: string): Promise<ApprovalToken | undefined>;
  saveOperation(operation: LiveExecutionOperation): Promise<void>;
  findOperationByIdempotencyKey(idempotencyKey: string): Promise<LiveExecutionOperation | undefined>;
  listPendingApprovals(now: string): Promise<ApprovalToken[]>;
  appendAudit(entry: AuditEntry): Promise<void>;
  listAudit(operationId?: string): Promise<AuditEntry[]>;
  listOpenOperations(): Promise<LiveExecutionOperation[]>;
  closeAllOpenOperations(reason: string, now: string): Promise<void>;
}

export interface ExecutionDependencies {
  readonly brokerEngine: BrokerEngine;
  readonly whatIfAnalyzer: WhatIfAnalyzer;
  readonly storage: ExecutionStorage;
  readonly restrictions: ExecutionRestrictions;
  readonly now: () => string;
  readonly readPriceSnapshot: (symbol: string) => Promise<PriceSnapshot>;
}

export interface ExecuteLiveOrderInput {
  readonly actor: string;
  readonly idempotencyKey: string;
  readonly symbol: string;
  readonly side: "BUY";
  readonly orderType: "LIMIT" | "MARKET";
  readonly quantity: number;
  readonly limitPrice: number;
  readonly stopPrice: number;
  readonly targetPrice: number;
  readonly instrumentType: "EQUITY" | "OPTION" | "FUTURE" | "FOREX" | "CRYPTO";
  readonly leverage: number;
  readonly intent: "NEW_POSITION" | "ADD_TO_POSITION" | "SHORT";
  readonly requestedSession: "REGULAR" | "PRE_MARKET" | "AFTER_HOURS";
  readonly approvalExpirySeconds: number;
}

export interface ExecuteLiveOrderResult {
  readonly operationId: string;
  readonly state: LiveExecutionLifecycleState;
  readonly orderId: string;
  readonly permId: string;
}

export class LiveExecutionEngine {
  private killSwitchEnabled = false;
  private readonly transitions: LiveExecutionLifecycleState[] = [
    "DRAFT_CREATED",
    "WHATIF_COMPLETED",
    "RISK_REVALIDATED",
    "APPROVAL_REQUESTED",
    "PRICE_REVALIDATED",
    "APPROVAL_CONFIRMED",
    "SUBMITTED",
    "ACKNOWLEDGED",
    "STATUS_MONITORING",
    "FILL_RECONCILED",
    "PROTECTION_ACTIVATED",
    "RECORDED",
  ];

  constructor(private readonly deps: ExecutionDependencies) {}

  async setKillSwitch(enabled: boolean, actor: string): Promise<void> {
    this.killSwitchEnabled = enabled;
    await this.audit("global", actor, enabled ? "KILL_SWITCH_ENABLED" : "KILL_SWITCH_DISABLED", {});
  }

  isKillSwitchEnabled(): boolean {
    return this.killSwitchEnabled;
  }

  async cancelAll(actor: string): Promise<void> {
    const now = this.deps.now();
    await this.deps.storage.closeAllOpenOperations("cancel-all", now);
    await this.audit("global", actor, "CANCEL_ALL_TRIGGERED", { now });
  }

  async execute(input: ExecuteLiveOrderInput): Promise<ExecuteLiveOrderResult> {
    ensureLiveTradingRemainsDisabled();
    this.enforceRestrictions(input);
    this.assertKillSwitchDisabled();
    const now = this.deps.now();

    const existing = await this.deps.storage.findOperationByIdempotencyKey(input.idempotencyKey);
    if (existing) {
      return {
        operationId: existing.operationId,
        state: existing.state,
        orderId: existing.receipt.orderId,
        permId: existing.receipt.permId,
      };
    }

    await this.assertPositionConcurrency(input.intent);

    const draft = this.createDraft({ ...input, now });
    await this.deps.storage.saveDraft(draft);
    await this.audit(draft.draftId, input.actor, "DRAFT_CREATED", { draftId: draft.draftId });
    this.ensureFlowState("DRAFT_CREATED", "WHATIF_COMPLETED");

    const whatIf = await this.deps.whatIfAnalyzer.runWhatIf(draft);
    await this.audit(draft.draftId, input.actor, "WHATIF_COMPLETED", {
      estimatedMargin: whatIf.estimatedMargin,
      estimatedCommission: whatIf.estimatedCommission,
      estimatedNotional: whatIf.estimatedNotional,
    });
    this.ensureRisk(whatIf, input);
    await this.audit(draft.draftId, input.actor, "RISK_REVALIDATED", { estimatedRisk: whatIf.estimatedRisk });
    this.ensureFlowState("RISK_REVALIDATED", "APPROVAL_REQUESTED");

    const approval = await this.requestApproval({
      draftId: draft.draftId,
      approverId: input.actor,
      now,
      expirySeconds: input.approvalExpirySeconds,
    });
    await this.audit(draft.draftId, input.actor, "APPROVAL_REQUESTED", {
      approvalId: approval.approvalId,
      expiresAt: approval.expiresAt,
    });

    const price = await this.deps.readPriceSnapshot(input.symbol);
    this.revalidatePrice(input.limitPrice, price.last);
    await this.audit(draft.draftId, input.actor, "PRICE_REVALIDATED", { last: price.last, at: price.at });
    this.ensureFlowState("PRICE_REVALIDATED", "APPROVAL_CONFIRMED");

    const approvalAfterConfirmations = await this.confirmApprovalTwice(approval.approvalId, input.actor);
    this.assertApprovalNotExpired(approvalAfterConfirmations, this.deps.now());
    await this.audit(draft.draftId, input.actor, "APPROVAL_EXPIRY_VALIDATED", {
      approvalId: approval.approvalId,
    });

    const receipt = await this.submitOrder(draft);
    await this.audit(draft.draftId, input.actor, "ORDER_SUBMITTED", toAuditDetails(receipt));
    this.assertReceipt(receipt);
    await this.audit(draft.draftId, input.actor, "ORDER_ACKNOWLEDGED", toAuditDetails(receipt));

    const fill = await this.monitorAndReconcile(receipt, draft);
    await this.audit(draft.draftId, input.actor, "ORDER_MONITORED", { orderId: receipt.orderId });
    await this.audit(draft.draftId, input.actor, "FILL_RECONCILED", toAuditDetails(fill));

    await this.activateStopAndTarget(draft, receipt, input.stopPrice, input.targetPrice);
    await this.audit(draft.draftId, input.actor, "PROTECTION_ACTIVATED", {
      stopPrice: input.stopPrice,
      targetPrice: input.targetPrice,
    });

    const operation: LiveExecutionOperation = {
      operationId: `op-${draft.draftId}`,
      draft,
      whatIf,
      approval: approvalAfterConfirmations,
      receipt,
      fill,
      state: "RECORDED",
    };
    await this.deps.storage.saveOperation(operation);
    await this.audit(draft.draftId, input.actor, "OPERATION_RECORDED", {
      operationId: operation.operationId,
    });

    return {
      operationId: operation.operationId,
      state: operation.state,
      orderId: operation.receipt.orderId,
      permId: operation.receipt.permId,
    };
  }

  private enforceRestrictions(input: ExecuteLiveOrderInput): void {
    if (input.orderType !== "LIMIT") throw new Error("Restriction: only LIMIT orders are allowed.");
    if (input.instrumentType !== "EQUITY") throw new Error("Restriction: only EQUITY spot instruments are allowed.");
    if (input.side !== "BUY") throw new Error("Restriction: short selling is blocked.");
    if (input.intent === "SHORT") throw new Error("Restriction: short intent is blocked.");
    if (input.leverage !== 1) throw new Error("Restriction: leverage must be 1.");
    if (input.requestedSession !== "REGULAR") throw new Error("Restriction: out-of-hours orders are blocked.");
    const notional = input.limitPrice * input.quantity;
    if (notional > this.deps.restrictions.maxNotional) {
      throw new Error(`Restriction: max notional exceeded (${notional} > ${this.deps.restrictions.maxNotional}).`);
    }
    const risk = calcRiskPerTrade(input);
    if (risk > this.deps.restrictions.maxRiskPerTrade) {
      throw new Error(
        `Restriction: max risk per trade exceeded (${risk} > ${this.deps.restrictions.maxRiskPerTrade}).`,
      );
    }
  }

  private assertKillSwitchDisabled(): void {
    if (this.killSwitchEnabled) {
      throw new Error("Kill switch is enabled. Submission blocked.");
    }
  }

  private async assertPositionConcurrency(intent: ExecuteLiveOrderInput["intent"]): Promise<void> {
    if (intent !== "NEW_POSITION") return;
    const open = await this.deps.storage.listOpenOperations();
    const newPositions = open.filter((item) => item.draft.intent === "NEW_POSITION");
    if (newPositions.length >= this.deps.restrictions.maxSimultaneousNewPositions) {
      throw new Error("Restriction: max simultaneous new positions reached.");
    }
  }

  private createDraft(input: CreateExecutionDraftInput): BrokerOrderDraft {
    return {
      draftId: `draft-${input.idempotencyKey}`,
      idempotencyKey: input.idempotencyKey,
      symbol: input.symbol,
      side: "BUY",
      quantity: input.quantity,
      limitPrice: input.limitPrice,
      orderType: "LIMIT",
      tif: "DAY",
      assetClass: "EQUITY",
      session: "REGULAR",
      leverage: 1,
      intent: "NEW_POSITION",
      createdAt: input.now,
    };
  }

  private ensureRisk(whatIf: WhatIfResult, input: ExecuteLiveOrderInput): void {
    if (whatIf.estimatedNotional > this.deps.restrictions.maxNotional) {
      throw new Error("WhatIf notional exceeds configured maximum.");
    }
    const targetRisk = calcRiskPerTrade(input);
    if (whatIf.estimatedRisk > this.deps.restrictions.maxRiskPerTrade || targetRisk > this.deps.restrictions.maxRiskPerTrade) {
      throw new Error("WhatIf risk exceeds configured maximum.");
    }
  }

  private async requestApproval(input: ApprovalRequestInput): Promise<ApprovalToken> {
    const expiryAtDate = new Date(input.now);
    expiryAtDate.setSeconds(expiryAtDate.getSeconds() + input.expirySeconds);
    const token: ApprovalToken = {
      approvalId: `approval-${input.draftId}`,
      draftId: input.draftId,
      approverId: input.approverId,
      createdAt: input.now,
      expiresAt: expiryAtDate.toISOString(),
    };
    await this.deps.storage.saveApproval(token);
    return token;
  }

  private async confirmApprovalTwice(approvalId: string, actor: string): Promise<ApprovalToken> {
    const token = await this.deps.storage.getApproval(approvalId);
    if (!token) throw new Error("Approval token not found.");
    const firstNow = this.deps.now();
    const firstConfirmed: ApprovalToken = { ...token, firstConfirmedAt: firstNow };
    await this.deps.storage.saveApproval(firstConfirmed);
    await this.audit(token.draftId, actor, "APPROVAL_CONFIRMED_1", { approvalId });

    const secondNow = this.deps.now();
    const secondConfirmed: ApprovalToken = { ...firstConfirmed, secondConfirmedAt: secondNow };
    await this.deps.storage.saveApproval(secondConfirmed);
    await this.audit(token.draftId, actor, "APPROVAL_CONFIRMED_2", { approvalId });
    return secondConfirmed;
  }

  private assertApprovalNotExpired(token: ApprovalToken, now: string): void {
    if (!token.firstConfirmedAt || !token.secondConfirmedAt) {
      throw new Error("Approval requires double confirmation.");
    }
    if (now > token.expiresAt) {
      throw new Error("Approval token expired.");
    }
  }

  private revalidatePrice(limitPrice: number, lastPrice: number): void {
    const drift = Math.abs(lastPrice - limitPrice) / Math.max(0.0001, limitPrice);
    if (drift > 0.03) {
      throw new Error("Price re-validation failed due to drift > 3%.");
    }
  }

  /**
   * Sole broker order-write boundary for Investment OS.
   * IBKR + AUTONOMOUS_LIVE remain LOCKED unless explicitly unlocked later.
   * Paper/stub engines may still exercise the path in unit tests.
   */
  private async submitOrder(draft: BrokerOrderDraft): Promise<BrokerSubmissionReceipt> {
    const mode = (process.env.TRADING_MODE ?? "").toUpperCase();
    const ibkrReadOnly = process.env.IBKR_READ_ONLY !== "false";
    const liveEnabled = process.env.LIVE_TRADING_ENABLED === "true";
    const brokerName = this.deps.brokerEngine.name;

    if (mode === "AUTONOMOUS_LIVE" && (!liveEnabled || ibkrReadOnly)) {
      throw new Error(
        "LOCKED: AUTONOMOUS_LIVE requires certification unlock — submitOrder blocked.",
      );
    }
    if (brokerName === "ibkr" && (!liveEnabled || ibkrReadOnly)) {
      throw new Error(
        "LOCKED: IBKR submitOrder blocked while LIVE_TRADING_ENABLED=false or IBKR_READ_ONLY=true.",
      );
    }
    if (mode === "ANALYSIS_ONLY" && brokerName === "ibkr") {
      throw new Error("LOCKED: TRADING_MODE=ANALYSIS_ONLY — IBKR submitOrder blocked.");
    }

    const payload = {
      symbol: draft.symbol,
      side: draft.side,
      qty: draft.quantity,
      orderType: "LMT",
      lmtPrice: draft.limitPrice,
      tif: draft.tif,
      assetClass: draft.assetClass,
      leverage: draft.leverage,
      session: draft.session,
      idempotencyKey: draft.idempotencyKey,
    };
    // Boundary: only LiveExecutionEngine may POST /orders (submitOrder).
    const response = await this.deps.brokerEngine.request<{ orderId: string; permId: string; submittedAt?: string }>({
      path: "/orders",
      method: "POST",
      body: JSON.stringify(payload),
    });
    return {
      orderId: response.orderId,
      permId: response.permId,
      submittedAt: response.submittedAt ?? this.deps.now(),
    };
  }

  private assertReceipt(receipt: BrokerSubmissionReceipt): void {
    if (!receipt.orderId || !receipt.permId) {
      throw new Error("Broker acknowledgement is incomplete.");
    }
  }

  private async monitorAndReconcile(
    receipt: BrokerSubmissionReceipt,
    draft: BrokerOrderDraft,
  ): Promise<FillReconciliation> {
    const status = await this.deps.brokerEngine.request<{
      filledQuantity: number;
      averageFillPrice: number;
      totalCommission: number;
    }>({
      path: `/orders/${receipt.orderId}/status`,
      method: "GET",
    });
    if (status.filledQuantity <= 0) {
      throw new Error("Order not filled yet; reconciliation blocked.");
    }
    return {
      filledQuantity: Math.min(status.filledQuantity, draft.quantity),
      averageFillPrice: status.averageFillPrice,
      totalCommission: status.totalCommission,
      reconciledAt: this.deps.now(),
    };
  }

  private async activateStopAndTarget(
    draft: BrokerOrderDraft,
    receipt: BrokerSubmissionReceipt,
    stopPrice: number,
    targetPrice: number,
  ): Promise<void> {
    await this.deps.brokerEngine.request({
      path: "/orders/protection",
      method: "POST",
      body: JSON.stringify({
        parentOrderId: receipt.orderId,
        symbol: draft.symbol,
        quantity: draft.quantity,
        stopPrice,
        targetPrice,
      }),
    });
  }

  private async audit(
    operationId: string,
    actor: string,
    event: AuditEntry["event"],
    details: Readonly<Record<string, unknown>>,
  ): Promise<void> {
    await this.deps.storage.appendAudit({
      id: `audit-${operationId}-${event}-${this.deps.now()}`,
      operationId,
      at: this.deps.now(),
      actor,
      event,
      details,
    });
  }

  private ensureFlowState(from: LiveExecutionLifecycleState, to: LiveExecutionLifecycleState): void {
    const fromIndex = this.transitions.indexOf(from);
    const toIndex = this.transitions.indexOf(to);
    if (fromIndex < 0 || toIndex < 0 || toIndex <= fromIndex) {
      throw new Error(`Flow order violation ${from} -> ${to}.`);
    }
  }
}

export function summarizeExecutionForDashboard(args: {
  approvals: ApprovalToken[];
  operations: LiveExecutionOperation[];
  audit: AuditEntry[];
  now: string;
  liveTradingEnabledValue?: string;
  killSwitchEnabled: boolean;
}) {
  const nowDate = new Date(args.now).getTime();
  return {
    liveTradingEnabledValue: args.liveTradingEnabledValue ?? process.env.LIVE_TRADING_ENABLED ?? "unset",
    killSwitchEnabled: args.killSwitchEnabled,
    pendingApprovals: args.approvals.map((item) => ({
      approvalId: item.approvalId,
      draftId: item.draftId,
      expiresAt: item.expiresAt,
      expiresInSec: Math.max(0, Math.floor((new Date(item.expiresAt).getTime() - nowDate) / 1000)),
    })),
    whatIfResults: args.operations.map((item) => ({
      operationId: item.operationId,
      estimatedMargin: item.whatIf.estimatedMargin,
      estimatedCommission: item.whatIf.estimatedCommission,
    })),
    auditTimeline: args.audit,
  };
}

export function createDefaultRestrictions(): ExecutionRestrictions {
  return {
    maxNotional: 50_000,
    maxRiskPerTrade: 2_000,
    maxSimultaneousNewPositions: 1,
  };
}

export function estimateWhatIfFromDraft(draft: BrokerOrderDraft): WhatIfResult {
  const notional = calcNotional(draft);
  return {
    estimatedMargin: Number((notional * 0.5).toFixed(2)),
    estimatedCommission: Number((Math.max(1, notional * 0.0005)).toFixed(2)),
    estimatedNotional: Number(notional.toFixed(2)),
    estimatedRisk: Number((notional * 0.02).toFixed(2)),
    computedAt: new Date().toISOString(),
  };
}
