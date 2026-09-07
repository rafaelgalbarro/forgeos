export type LiveRiskDecision = "PASS" | "PASS_WITH_REDUCED_SIZE" | "BLOCK" | "HALT_SYSTEM";
export type LiveRiskCategory = "ACCOUNT" | "ORDER" | "SYSTEM";
export type LiveRiskCheckStatus = "PASS" | "FAIL";
export type LiveRiskSeverity = "REDUCE_ONLY" | "BLOCK" | "HALT";

export interface LiveRiskCheckResult {
  readonly code: string;
  readonly category: LiveRiskCategory;
  readonly status: LiveRiskCheckStatus;
  readonly severity: LiveRiskSeverity;
  readonly value: number | string | boolean;
  readonly threshold: number | string | boolean;
  readonly explanation: string;
  readonly remediation: string;
}

export interface LiveRiskAccountSnapshot {
  readonly availableCapital: number;
  readonly availableMargin: number;
  readonly excessLiquidity: number;
  readonly dailyDrawdownPct: number;
  readonly weeklyDrawdownPct: number;
  readonly monthlyDrawdownPct: number;
  readonly maxDailyLoss: number;
  readonly currentDailyLoss: number;
  readonly maxNumberOfOrders: number;
  readonly currentNumberOfOrders: number;
  readonly maxNumberOfPositions: number;
  readonly currentNumberOfPositions: number;
  readonly grossExposure: number;
  readonly maxGrossExposure: number;
  readonly netExposure: number;
  readonly maxNetExposure: number;
  readonly leverage: number;
  readonly maxLeverage: number;
  readonly concentration: number;
  readonly maxConcentration: number;
  readonly currency: string;
  readonly allowedCurrencies: readonly string[];
  readonly country: string;
  readonly allowedCountries: readonly string[];
  readonly sector: string;
  readonly allowedSectors: readonly string[];
  readonly correlation: number;
  readonly maxCorrelation: number;
  readonly gapRisk: number;
  readonly maxGapRisk: number;
}

export interface LiveRiskOrderIntent {
  readonly requestedQuantity: number;
  readonly maxQuantity: number;
  readonly requestedNotional: number;
  readonly maxNotional: number;
  readonly requestedRiskPerTrade: number;
  readonly maxRiskPerTrade: number;
  readonly mandatoryStopPresent: boolean;
  readonly stopDistance: number;
  readonly minStopDistance: number;
  readonly spreadBps: number;
  readonly maxSpreadBps: number;
  readonly slippageBps: number;
  readonly maxSlippageBps: number;
  readonly volume: number;
  readonly minVolume: number;
  readonly price: number;
  readonly tickSize: number;
  readonly inAllowedSession: boolean;
  readonly allowedProduct: boolean;
  readonly allowedMarket: boolean;
  readonly allowedDirection: boolean;
  readonly shortAllowed: boolean;
  readonly side: "BUY" | "SELL_SHORT";
  readonly realtimeDataAvailable: boolean;
  readonly contractResolvedWithoutAmbiguity: boolean;
}

export interface LiveRiskSystemState {
  readonly stableConnection: boolean;
  readonly heartbeatHealthy: boolean;
  readonly clockSynchronized: boolean;
  readonly freshData: boolean;
  readonly brokerReconciled: boolean;
  readonly noOrphanOrders: boolean;
  readonly noUnknownState: boolean;
  readonly noEmergencyStop: boolean;
  readonly noActiveCircuitBreaker: boolean;
}

export interface LiveRiskOverrideRequest {
  readonly overrideId: string;
  readonly identity: string;
  readonly reason: string;
  readonly expiresAtUtc: string;
  readonly requestedAtUtc: string;
  readonly approvedBy: string;
  readonly allowedCheckCodes?: readonly string[];
}

export interface LiveRiskOverrideAudit {
  readonly applied: boolean;
  readonly overrideId?: string;
  readonly by: string;
  readonly reason: string;
  readonly expiresAtUtc: string;
}

export interface LiveRiskEvaluationInput {
  readonly requestId: string;
  readonly evaluatedAtUtc: string;
  readonly account: LiveRiskAccountSnapshot;
  readonly order: LiveRiskOrderIntent;
  readonly system: LiveRiskSystemState;
  readonly overrideRequest?: LiveRiskOverrideRequest;
}

export interface LiveRiskEvaluationResult {
  readonly requestId: string;
  readonly decision: LiveRiskDecision;
  readonly checks: readonly LiveRiskCheckResult[];
  readonly reducedQuantity?: number;
  readonly explanation: string;
  readonly remediation: string;
  readonly overrideAudit?: LiveRiskOverrideAudit;
}

function assertNonEmpty(value: string, field: string): void {
  if (!value || value.trim().length === 0) {
    throw new Error(`${field} is required.`);
  }
}

function assertPositive(value: number, field: string): void {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be > 0.`);
  }
}

function assertNonNegative(value: number, field: string): void {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} must be >= 0.`);
  }
}

function assertBoolean(value: boolean, field: string): void {
  if (typeof value !== "boolean") {
    throw new Error(`${field} must be boolean.`);
  }
}

function assertDate(value: string, field: string): void {
  assertNonEmpty(value, field);
  if (Number.isNaN(Date.parse(value))) {
    throw new Error(`${field} must be a valid ISO date.`);
  }
}

export function ensureLiveRiskInput(input: LiveRiskEvaluationInput): LiveRiskEvaluationInput {
  assertNonEmpty(input.requestId, "LiveRiskEvaluationInput.requestId");
  assertDate(input.evaluatedAtUtc, "LiveRiskEvaluationInput.evaluatedAtUtc");
  assertPositive(input.order.requestedQuantity, "LiveRiskOrderIntent.requestedQuantity");
  assertPositive(input.order.tickSize, "LiveRiskOrderIntent.tickSize");
  assertPositive(input.order.maxQuantity, "LiveRiskOrderIntent.maxQuantity");
  assertPositive(input.order.maxNotional, "LiveRiskOrderIntent.maxNotional");
  assertPositive(input.account.maxNumberOfOrders, "LiveRiskAccountSnapshot.maxNumberOfOrders");
  assertPositive(input.account.maxNumberOfPositions, "LiveRiskAccountSnapshot.maxNumberOfPositions");
  assertPositive(input.account.maxGrossExposure, "LiveRiskAccountSnapshot.maxGrossExposure");
  assertPositive(input.account.maxNetExposure, "LiveRiskAccountSnapshot.maxNetExposure");
  assertPositive(input.account.maxLeverage, "LiveRiskAccountSnapshot.maxLeverage");
  assertPositive(input.account.maxConcentration, "LiveRiskAccountSnapshot.maxConcentration");
  assertPositive(input.account.maxCorrelation, "LiveRiskAccountSnapshot.maxCorrelation");
  assertPositive(input.account.maxGapRisk, "LiveRiskAccountSnapshot.maxGapRisk");
  assertNonNegative(input.account.currentDailyLoss, "LiveRiskAccountSnapshot.currentDailyLoss");
  assertBoolean(input.system.noEmergencyStop, "LiveRiskSystemState.noEmergencyStop");
  return input;
}

export function ensureOverrideRequest(
  overrideRequest: LiveRiskOverrideRequest,
  nowUtc: string,
): LiveRiskOverrideRequest {
  assertNonEmpty(overrideRequest.overrideId, "LiveRiskOverrideRequest.overrideId");
  assertNonEmpty(overrideRequest.identity, "LiveRiskOverrideRequest.identity");
  assertNonEmpty(overrideRequest.approvedBy, "LiveRiskOverrideRequest.approvedBy");
  assertNonEmpty(overrideRequest.reason, "LiveRiskOverrideRequest.reason");
  assertDate(overrideRequest.expiresAtUtc, "LiveRiskOverrideRequest.expiresAtUtc");
  assertDate(overrideRequest.requestedAtUtc, "LiveRiskOverrideRequest.requestedAtUtc");
  if (Date.parse(overrideRequest.expiresAtUtc) <= Date.parse(nowUtc)) {
    throw new Error("LiveRiskOverrideRequest.expiresAtUtc must be in the future.");
  }
  return overrideRequest;
}
