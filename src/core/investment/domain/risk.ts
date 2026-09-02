import { assertNonEmpty, assertPercent, assertSerializable } from "./guards";

export type RiskGateStatus = "ALLOWED" | "BLOCKED";

export interface RiskPolicy {
  readonly maxPositionPct: number;
  readonly maxRiskPct: number;
  readonly maxSectorPct: number;
  readonly maxCountryPct: number;
  readonly maxCurrencyPct: number;
  readonly maxDrawdownPct: number;
  readonly maxVarPct: number;
  readonly maxCvarPct: number;
  readonly maxExposurePct: number;
  readonly minLiquidityScore: number;
  readonly maxParticipationRate: number;
  readonly kellyFractionCap: number;
  readonly confidenceLevel: number;
  readonly horizonDays: number;
  readonly minStopLossPct: number;
  readonly targetRewardRiskRatio: number;
}

export interface OperationRiskContext {
  readonly operationId: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly quantity: number;
  readonly price: number;
  readonly sector: string;
  readonly country: string;
  readonly currency: string;
  readonly expectedReturnPct: number;
  readonly volatilityPct: number;
  readonly confidence: number;
  readonly currentPositionPct: number;
  readonly currentSectorExposurePct: number;
  readonly currentCountryExposurePct: number;
  readonly currentCurrencyExposurePct: number;
  readonly currentDrawdownPct: number;
  readonly currentGrossExposurePct: number;
  readonly portfolioValue: number;
  readonly avgDailyVolume: number;
  readonly bidAskSpreadPct: number;
  readonly openPositions: number;
}

export interface RiskMetricSnapshot {
  readonly tradeNotional: number;
  readonly requestedPositionPct: number;
  readonly projectedPositionPct: number;
  readonly projectedSectorPct: number;
  readonly projectedCountryPct: number;
  readonly projectedCurrencyPct: number;
  readonly projectedRiskPct: number;
  readonly projectedDrawdownPct: number;
  readonly varPct: number;
  readonly cvarPct: number;
  readonly kellyPct: number;
  readonly projectedExposurePct: number;
  readonly liquidityScore: number;
  readonly participationRate: number;
  readonly recommendedStopLossPct: number;
  readonly recommendedTakeProfitPct: number;
  readonly recommendedPositionSizePct: number;
}

export interface BlockReason {
  readonly code: string;
  readonly rule: string;
  readonly message: string;
  readonly actual: number | string;
  readonly limit: number | string;
}

export interface RiskCheckResult {
  readonly rule: string;
  readonly passed: boolean;
  readonly details: string;
  readonly actual: number | string;
  readonly limit: number | string;
}

export interface RiskValidationResult {
  readonly status: RiskGateStatus;
  readonly checks: readonly RiskCheckResult[];
  readonly blockReasons: readonly BlockReason[];
  readonly metrics: RiskMetricSnapshot;
  readonly recommendations: {
    readonly stopLossPct: number;
    readonly takeProfitPct: number;
    readonly positionSizePct: number;
  };
  readonly explanation: string;
}

export const DEFAULT_RISK_POLICY: RiskPolicy = {
  maxPositionPct: 10,
  maxRiskPct: 2,
  maxSectorPct: 30,
  maxCountryPct: 35,
  maxCurrencyPct: 40,
  maxDrawdownPct: 15,
  maxVarPct: 3,
  maxCvarPct: 4,
  maxExposurePct: 120,
  minLiquidityScore: 0.45,
  maxParticipationRate: 0.1,
  kellyFractionCap: 0.5,
  confidenceLevel: 0.95,
  horizonDays: 1,
  minStopLossPct: 2,
  targetRewardRiskRatio: 2,
};

export function ensureRiskPolicy(policy: RiskPolicy): RiskPolicy {
  assertPercent(policy.maxPositionPct, "RiskPolicy.maxPositionPct");
  assertPercent(policy.maxRiskPct, "RiskPolicy.maxRiskPct");
  assertPercent(policy.maxSectorPct, "RiskPolicy.maxSectorPct");
  assertPercent(policy.maxCountryPct, "RiskPolicy.maxCountryPct");
  assertPercent(policy.maxCurrencyPct, "RiskPolicy.maxCurrencyPct");
  assertPercent(policy.maxDrawdownPct, "RiskPolicy.maxDrawdownPct");
  assertPercent(policy.maxVarPct, "RiskPolicy.maxVarPct");
  assertPercent(policy.maxCvarPct, "RiskPolicy.maxCvarPct");
  if (policy.maxExposurePct < 0) {
    throw new Error("RiskPolicy.maxExposurePct must be >= 0");
  }
  if (policy.minLiquidityScore < 0 || policy.minLiquidityScore > 1) {
    throw new Error("RiskPolicy.minLiquidityScore must be between 0 and 1");
  }
  if (policy.maxParticipationRate <= 0 || policy.maxParticipationRate > 1) {
    throw new Error("RiskPolicy.maxParticipationRate must be between 0 and 1");
  }
  if (policy.kellyFractionCap <= 0 || policy.kellyFractionCap > 1) {
    throw new Error("RiskPolicy.kellyFractionCap must be between 0 and 1");
  }
  if (policy.confidenceLevel <= 0.5 || policy.confidenceLevel >= 0.9999) {
    throw new Error("RiskPolicy.confidenceLevel must be between 0.5 and 0.9999");
  }
  if (!Number.isInteger(policy.horizonDays) || policy.horizonDays <= 0) {
    throw new Error("RiskPolicy.horizonDays must be a positive integer");
  }
  if (policy.minStopLossPct <= 0) {
    throw new Error("RiskPolicy.minStopLossPct must be > 0");
  }
  if (policy.targetRewardRiskRatio <= 0) {
    throw new Error("RiskPolicy.targetRewardRiskRatio must be > 0");
  }
  assertSerializable(policy, "RiskPolicy");
  return policy;
}

export function ensureRiskContext(context: OperationRiskContext): OperationRiskContext {
  assertNonEmpty(context.operationId, "OperationRiskContext.operationId");
  assertNonEmpty(context.symbol, "OperationRiskContext.symbol");
  assertNonEmpty(context.sector, "OperationRiskContext.sector");
  assertNonEmpty(context.country, "OperationRiskContext.country");
  assertNonEmpty(context.currency, "OperationRiskContext.currency");
  assertPercent(context.expectedReturnPct, "OperationRiskContext.expectedReturnPct");
  assertPercent(context.volatilityPct, "OperationRiskContext.volatilityPct");
  if (context.confidence < 0 || context.confidence > 1) {
    throw new Error("OperationRiskContext.confidence must be between 0 and 1");
  }
  assertPercent(context.currentPositionPct, "OperationRiskContext.currentPositionPct");
  assertPercent(context.currentSectorExposurePct, "OperationRiskContext.currentSectorExposurePct");
  assertPercent(context.currentCountryExposurePct, "OperationRiskContext.currentCountryExposurePct");
  assertPercent(context.currentCurrencyExposurePct, "OperationRiskContext.currentCurrencyExposurePct");
  assertPercent(context.currentDrawdownPct, "OperationRiskContext.currentDrawdownPct");
  if (context.currentGrossExposurePct < 0) {
    throw new Error("OperationRiskContext.currentGrossExposurePct must be >= 0");
  }
  if (context.quantity <= 0 || !Number.isFinite(context.quantity)) {
    throw new Error("OperationRiskContext.quantity must be > 0");
  }
  if (context.price <= 0 || !Number.isFinite(context.price)) {
    throw new Error("OperationRiskContext.price must be > 0");
  }
  if (context.portfolioValue <= 0 || !Number.isFinite(context.portfolioValue)) {
    throw new Error("OperationRiskContext.portfolioValue must be > 0");
  }
  if (context.avgDailyVolume <= 0 || !Number.isFinite(context.avgDailyVolume)) {
    throw new Error("OperationRiskContext.avgDailyVolume must be > 0");
  }
  assertPercent(context.bidAskSpreadPct, "OperationRiskContext.bidAskSpreadPct");
  if (context.openPositions < 0 || !Number.isFinite(context.openPositions)) {
    throw new Error("OperationRiskContext.openPositions must be >= 0");
  }
  assertSerializable(context, "OperationRiskContext");
  return context;
}
