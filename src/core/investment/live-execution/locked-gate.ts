/**
 * SUPERVISED LOCKED gate for Live Execution v1 certification.
 * Always blocks broker submission. Never calls placeOrder.
 * Does not mutate LIVE_TRADING_ENABLED or IBKR_READ_ONLY.
 */

import {
  calcNotional,
  calcRiskPerTrade,
  ensureLiveTradingRemainsDisabled,
  type ApprovalToken,
  type AuditEntry,
  type BrokerOrderDraft,
  type WhatIfResult,
} from "./domain";
import {
  estimateWhatIfFromDraft,
  type ExecutionStorage,
  type ExecuteLiveOrderInput,
  type PriceSnapshot,
} from "./application";

export type SupervisedMode = "SUPERVISED_LOCKED" | "ANALYSIS_ONLY";

export interface LockedPipelineResult {
  readonly mode: SupervisedMode;
  readonly state: "BLOCKED";
  readonly draft: BrokerOrderDraft;
  readonly whatIf: WhatIfResult;
  readonly approval: ApprovalToken;
  readonly blockReason: string;
  readonly liveTradingEnabled: string;
  readonly ibkrReadOnly: string;
  readonly placeOrderInvoked: false;
}

export interface LockedGateRestrictions {
  readonly maxNotional: number;
  readonly maxRiskPerTrade: number;
  readonly allowedSymbols: readonly string[];
  readonly maxPriceAgeMs: number;
}

export const DEFAULT_LOCKED_RESTRICTIONS: LockedGateRestrictions = {
  maxNotional: 100,
  maxRiskPerTrade: 20,
  allowedSymbols: ["AAPL", "MSFT"],
  maxPriceAgeMs: 15_000,
};

function assertFlagsUnchanged(): void {
  ensureLiveTradingRemainsDisabled();
  if (process.env.IBKR_READ_ONLY !== "true") {
    throw new Error("IBKR_READ_ONLY must stay true during SUPERVISED_LOCKED certification.");
  }
}

export function estimateWhatIfForCertification(draft: BrokerOrderDraft): WhatIfResult {
  return estimateWhatIfFromDraft(draft);
}

export function assertSymbolAllowed(symbol: string, allowed: readonly string[]): void {
  if (!allowed.map((s) => s.toUpperCase()).includes(symbol.toUpperCase())) {
    throw new Error(`Disallowed symbol: ${symbol}`);
  }
}

export function assertNotionalWithinLimit(quantity: number, limitPrice: number, maxNotional: number): void {
  const notional = quantity * limitPrice;
  if (notional > maxNotional) {
    throw new Error(`Excessive notional: ${notional} > ${maxNotional}`);
  }
}

export function assertPriceFresh(snapshot: PriceSnapshot, nowIso: string, maxAgeMs: number): void {
  const age = new Date(nowIso).getTime() - new Date(snapshot.at).getTime();
  if (Number.isNaN(age) || age > maxAgeMs) {
    throw new Error(`Stale market data: ageMs=${age} max=${maxAgeMs}`);
  }
}

export function assertBrokerConnected(connected: boolean): void {
  if (!connected) {
    throw new Error("IBKR disconnected — execution path blocked.");
  }
}

/**
 * Runs draft → what-if → risk → double approval, then hard-blocks before any broker submit.
 */
export async function runSupervisedLockedPipeline(args: {
  readonly input: ExecuteLiveOrderInput;
  readonly storage: ExecutionStorage;
  readonly restrictions?: LockedGateRestrictions;
  readonly price: PriceSnapshot;
  readonly now: () => string;
  readonly brokerConnected: boolean;
  readonly killSwitchEnabled?: boolean;
}): Promise<LockedPipelineResult> {
  assertFlagsUnchanged();
  const restrictions = args.restrictions ?? DEFAULT_LOCKED_RESTRICTIONS;
  const now = args.now();

  if (args.killSwitchEnabled) {
    throw new Error("Kill switch / emergency stop is enabled. Submission blocked.");
  }
  assertBrokerConnected(args.brokerConnected);
  assertSymbolAllowed(args.input.symbol, restrictions.allowedSymbols);
  assertNotionalWithinLimit(args.input.quantity, args.input.limitPrice, restrictions.maxNotional);
  assertPriceFresh(args.price, now, restrictions.maxPriceAgeMs);

  if (args.input.orderType !== "LIMIT") throw new Error("Restriction: only LIMIT orders are allowed.");
  if (args.input.instrumentType !== "EQUITY") throw new Error("Restriction: only EQUITY spot instruments are allowed.");
  if (args.input.side !== "BUY") throw new Error("Restriction: short selling is blocked.");
  if (args.input.leverage !== 1) throw new Error("Restriction: leverage must be 1.");
  if (args.input.requestedSession !== "REGULAR") throw new Error("Restriction: out-of-hours orders are blocked.");

  const draft: BrokerOrderDraft = {
    draftId: `draft-${args.input.idempotencyKey}`,
    idempotencyKey: args.input.idempotencyKey,
    symbol: args.input.symbol.toUpperCase(),
    side: "BUY",
    quantity: args.input.quantity,
    limitPrice: args.input.limitPrice,
    orderType: "LIMIT",
    tif: "DAY",
    assetClass: "EQUITY",
    session: "REGULAR",
    leverage: 1,
    intent: args.input.intent === "ADD_TO_POSITION" ? "ADD_TO_POSITION" : "NEW_POSITION",
    createdAt: now,
  };

  await args.storage.saveDraft(draft);
  await appendAudit(args.storage, draft.draftId, args.input.actor, "DRAFT_CREATED", { draftId: draft.draftId });

  const whatIf = estimateWhatIfForCertification(draft);
  await appendAudit(args.storage, draft.draftId, args.input.actor, "WHATIF_COMPLETED", {
    estimatedNotional: whatIf.estimatedNotional,
    estimatedRisk: whatIf.estimatedRisk,
  });

  if (whatIf.estimatedNotional > restrictions.maxNotional) {
    throw new Error("WhatIf notional exceeds configured maximum.");
  }
  const risk = calcRiskPerTrade({
    quantity: args.input.quantity,
    limitPrice: args.input.limitPrice,
    stopPrice: args.input.stopPrice,
  });
  if (risk > restrictions.maxRiskPerTrade || whatIf.estimatedRisk > restrictions.maxRiskPerTrade) {
    throw new Error("WhatIf risk exceeds configured maximum.");
  }
  await appendAudit(args.storage, draft.draftId, args.input.actor, "RISK_REVALIDATED", { estimatedRisk: risk });

  const expiresAt = new Date(now);
  expiresAt.setSeconds(expiresAt.getSeconds() + args.input.approvalExpirySeconds);
  let approval: ApprovalToken = {
    approvalId: `approval-${draft.draftId}`,
    draftId: draft.draftId,
    approverId: args.input.actor,
    createdAt: now,
    expiresAt: expiresAt.toISOString(),
  };
  await args.storage.saveApproval(approval);
  await appendAudit(args.storage, draft.draftId, args.input.actor, "APPROVAL_REQUESTED", {
    approvalId: approval.approvalId,
    expiresAt: approval.expiresAt,
  });

  const confirm1 = args.now();
  approval = { ...approval, firstConfirmedAt: confirm1 };
  await args.storage.saveApproval(approval);
  await appendAudit(args.storage, draft.draftId, args.input.actor, "APPROVAL_CONFIRMED_1", {
    approvalId: approval.approvalId,
  });

  const confirm2 = args.now();
  approval = { ...approval, secondConfirmedAt: confirm2 };
  await args.storage.saveApproval(approval);
  await appendAudit(args.storage, draft.draftId, args.input.actor, "APPROVAL_CONFIRMED_2", {
    approvalId: approval.approvalId,
  });

  if (confirm2 > approval.expiresAt) {
    throw new Error("Approval token expired.");
  }
  await appendAudit(args.storage, draft.draftId, args.input.actor, "APPROVAL_EXPIRY_VALIDATED", {
    approvalId: approval.approvalId,
  });

  const blockReason =
    "SUPERVISED_LOCKED: execution blocked before broker submit. LIVE_TRADING_ENABLED=false, IBKR_READ_ONLY=true, placeOrder not invoked.";
  await appendAudit(args.storage, draft.draftId, args.input.actor, "BLOCKED", {
    reason: blockReason,
    notional: calcNotional(draft),
    placeOrderInvoked: false,
  });

  return {
    mode: "SUPERVISED_LOCKED",
    state: "BLOCKED",
    draft,
    whatIf,
    approval,
    blockReason,
    liveTradingEnabled: process.env.LIVE_TRADING_ENABLED ?? "unset",
    ibkrReadOnly: process.env.IBKR_READ_ONLY ?? "unset",
    placeOrderInvoked: false,
  };
}

async function appendAudit(
  storage: ExecutionStorage,
  operationId: string,
  actor: string,
  event: AuditEntry["event"],
  details: Readonly<Record<string, unknown>>,
): Promise<void> {
  await storage.appendAudit({
    id: `audit-${operationId}-${event}-${Date.now()}`,
    operationId,
    at: new Date().toISOString(),
    actor,
    event,
    details,
  });
}

export function simulateCancelAllAudit(actor: string): AuditEntry {
  return {
    id: `audit-global-CANCEL_ALL-${Date.now()}`,
    operationId: "global",
    at: new Date().toISOString(),
    actor,
    event: "CANCEL_ALL_TRIGGERED",
    details: { simulated: true, placeOrderInvoked: false },
  };
}

export function reconcileSnapshots(before: unknown, after: unknown): {
  readonly unchanged: boolean;
  readonly detail: string;
} {
  const left = JSON.stringify(before);
  const right = JSON.stringify(after);
  return {
    unchanged: left === right,
    detail: left === right ? "positions/orders unchanged after blocked execute" : "snapshot drift detected",
  };
}
