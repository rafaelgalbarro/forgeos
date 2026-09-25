export type LiveExecutionLifecycleState =
  | "DRAFT_CREATED"
  | "WHATIF_COMPLETED"
  | "RISK_REVALIDATED"
  | "APPROVAL_REQUESTED"
  | "PRICE_REVALIDATED"
  | "APPROVAL_CONFIRMED"
  | "SUBMITTED"
  | "ACKNOWLEDGED"
  | "STATUS_MONITORING"
  | "FILL_RECONCILED"
  | "PROTECTION_ACTIVATED"
  | "RECORDED"
  | "BLOCKED"
  | "CANCELLED";

export interface ExecutionRestrictions {
  readonly maxNotional: number;
  readonly maxRiskPerTrade: number;
  readonly maxSimultaneousNewPositions: number;
}

export interface BrokerOrderDraft {
  readonly draftId: string;
  readonly idempotencyKey: string;
  readonly symbol: string;
  readonly side: "BUY";
  readonly quantity: number;
  readonly limitPrice: number;
  readonly orderType: "LIMIT";
  readonly tif: "DAY";
  readonly assetClass: "EQUITY";
  readonly session: "REGULAR";
  readonly leverage: 1;
  readonly intent: "NEW_POSITION" | "ADD_TO_POSITION";
  readonly createdAt: string;
}

export interface WhatIfResult {
  readonly estimatedMargin: number;
  readonly estimatedCommission: number;
  readonly estimatedNotional: number;
  readonly estimatedRisk: number;
  readonly computedAt: string;
}

export interface ApprovalToken {
  readonly approvalId: string;
  readonly draftId: string;
  readonly approverId: string;
  readonly createdAt: string;
  readonly expiresAt: string;
  readonly firstConfirmedAt?: string;
  readonly secondConfirmedAt?: string;
}

export interface BrokerSubmissionReceipt {
  readonly orderId: string;
  readonly permId: string;
  readonly submittedAt: string;
}

export interface FillReconciliation {
  readonly filledQuantity: number;
  readonly averageFillPrice: number;
  readonly totalCommission: number;
  readonly reconciledAt: string;
}

export interface LiveExecutionOperation {
  readonly operationId: string;
  readonly draft: BrokerOrderDraft;
  readonly whatIf: WhatIfResult;
  readonly approval: ApprovalToken;
  readonly receipt: BrokerSubmissionReceipt;
  readonly fill: FillReconciliation;
  readonly state: LiveExecutionLifecycleState;
}

export interface AuditEntry {
  readonly id: string;
  readonly operationId: string;
  readonly at: string;
  readonly actor: string;
  readonly event:
    | "DRAFT_CREATED"
    | "WHATIF_COMPLETED"
    | "RISK_REVALIDATED"
    | "APPROVAL_REQUESTED"
    | "APPROVAL_CONFIRMED_1"
    | "APPROVAL_CONFIRMED_2"
    | "PRICE_REVALIDATED"
    | "APPROVAL_EXPIRY_VALIDATED"
    | "ORDER_SUBMITTED"
    | "ORDER_ACKNOWLEDGED"
    | "ORDER_MONITORED"
    | "FILL_RECONCILED"
    | "PROTECTION_ACTIVATED"
    | "OPERATION_RECORDED"
    | "KILL_SWITCH_ENABLED"
    | "KILL_SWITCH_DISABLED"
    | "CANCEL_ALL_TRIGGERED"
    | "BLOCKED";
  readonly details: Readonly<Record<string, unknown>>;
}

export interface CreateExecutionDraftInput {
  readonly idempotencyKey: string;
  readonly symbol: string;
  readonly quantity: number;
  readonly limitPrice: number;
  readonly stopPrice: number;
  readonly targetPrice: number;
  readonly now: string;
}

export interface ApprovalRequestInput {
  readonly draftId: string;
  readonly approverId: string;
  readonly now: string;
  readonly expirySeconds: number;
}

export function calcNotional(draft: BrokerOrderDraft): number {
  return draft.quantity * draft.limitPrice;
}

export function calcRiskPerTrade(input: {
  quantity: number;
  limitPrice: number;
  stopPrice: number;
}): number {
  return Math.max(0, (input.limitPrice - input.stopPrice) * input.quantity);
}

export function ensureLiveTradingRemainsDisabled(): void {
  if (process.env.LIVE_TRADING_ENABLED !== "false") {
    throw new Error("LIVE_TRADING_ENABLED must stay false.");
  }
}
