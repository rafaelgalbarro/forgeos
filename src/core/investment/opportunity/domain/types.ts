import type { MarketRegime, RiskLevel } from "../../domain/entities";
import { assertConfidence, assertNonEmpty, assertSerializable } from "../../domain/guards";

export type OpportunityAssetClass =
  | "stocks"
  | "etf"
  | "indices"
  | "forex"
  | "futures"
  | "bonds"
  | "commodities"
  | "crypto";

export type OpportunityDetectionKind =
  | "breakout"
  | "momentum"
  | "reversal"
  | "volatility"
  | "gap"
  | "volume_change"
  | "relative_strength"
  | "relative_weakness"
  | "sector_rotation"
  | "geographic_rotation"
  | "correlation"
  | "decorrelation"
  | "macro_event"
  | "news"
  | "earnings";

export type OpportunityDirection = "long" | "short" | "neutral";

export type OpportunityCapabilityFlags = Readonly<{
  stocks: boolean;
  etf: boolean;
  indices: boolean;
  forex: boolean;
  futures: boolean;
  bonds: boolean;
  commodities: boolean;
  crypto: boolean;
}>;

export interface OpportunityInstrumentMeta {
  readonly id: string;
  readonly symbol: string;
  readonly name?: string;
  readonly assetClass: OpportunityAssetClass;
  readonly market: string;
  readonly currency: string;
  readonly sector?: string;
  readonly region?: string;
  readonly exchange?: string;
}

export interface OpportunityEvidenceItem {
  readonly code: string;
  readonly detail: string;
  readonly weight: number;
}

export interface OpportunityRiskProfile {
  readonly level: RiskLevel;
  readonly factors: readonly string[];
  readonly maxAdverseMovePct: number;
  readonly liquidityRisk: number;
  readonly eventRisk: number;
}

export interface OpportunityPriceZone {
  readonly from: number;
  readonly to: number;
}

export interface OpportunityCandidate {
  readonly id: string;
  readonly instrument: OpportunityInstrumentMeta;
  readonly detection: OpportunityDetectionKind;
  readonly direction: OpportunityDirection;
  readonly timeframe: string;
  readonly score: number;
  readonly confidence: number;
  readonly evidence: readonly OpportunityEvidenceItem[];
  readonly risk: OpportunityRiskProfile;
  readonly entryZone: OpportunityPriceZone;
  readonly stop: number;
  readonly target: number;
  readonly marketRegime: MarketRegime;
  readonly expiry: string;
  readonly detectedAt: string;
  readonly priceSource?: string;
  readonly priceCapturedAt?: string;
  readonly priceQuality?: "REAL" | "DELAYED" | "STALE" | "DEMO" | "UNAVAILABLE";
  readonly analysisOnly: true;
  readonly orderExecution: "disabled";
}

export interface OpportunityScanResult {
  readonly scannedAt: string;
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly candidates: readonly OpportunityCandidate[];
  readonly skippedAssetClasses: readonly OpportunityAssetClass[];
  readonly scanDurationMs: number;
}

export function defaultOpportunityCapabilityFlags(
  overrides?: Partial<OpportunityCapabilityFlags>,
): OpportunityCapabilityFlags {
  return {
    stocks: true,
    etf: true,
    indices: true,
    forex: true,
    futures: true,
    bonds: true,
    commodities: true,
    crypto: false,
    ...overrides,
  };
}

export function ensureOpportunityCandidate(candidate: OpportunityCandidate): OpportunityCandidate {
  assertNonEmpty(candidate.id, "OpportunityCandidate.id");
  assertNonEmpty(candidate.instrument.id, "OpportunityCandidate.instrument.id");
  assertNonEmpty(candidate.instrument.symbol, "OpportunityCandidate.instrument.symbol");
  assertNonEmpty(candidate.instrument.market, "OpportunityCandidate.instrument.market");
  assertNonEmpty(candidate.instrument.currency, "OpportunityCandidate.instrument.currency");
  assertNonEmpty(candidate.timeframe, "OpportunityCandidate.timeframe");
  assertNonEmpty(candidate.detectedAt, "OpportunityCandidate.detectedAt");
  assertNonEmpty(candidate.expiry, "OpportunityCandidate.expiry");

  if (!Number.isFinite(candidate.score) || candidate.score < 0 || candidate.score > 100) {
    throw new Error("OpportunityCandidate.score must be between 0 and 100");
  }
  assertConfidence(candidate.confidence, "OpportunityCandidate.confidence");
  if (candidate.evidence.length === 0) {
    throw new Error("OpportunityCandidate.evidence cannot be empty");
  }
  for (const item of candidate.evidence) {
    assertNonEmpty(item.code, "OpportunityCandidate.evidence.code");
    assertNonEmpty(item.detail, "OpportunityCandidate.evidence.detail");
    assertConfidence(item.weight, "OpportunityCandidate.evidence.weight");
  }
  if (!Number.isFinite(candidate.entryZone.from) || !Number.isFinite(candidate.entryZone.to)) {
    throw new Error("OpportunityCandidate.entryZone must be finite");
  }
  if (!Number.isFinite(candidate.stop) || !Number.isFinite(candidate.target)) {
    throw new Error("OpportunityCandidate.stop/target must be finite");
  }
  assertConfidence(candidate.risk.liquidityRisk, "OpportunityCandidate.risk.liquidityRisk");
  assertConfidence(candidate.risk.eventRisk, "OpportunityCandidate.risk.eventRisk");
  if (!Number.isFinite(candidate.risk.maxAdverseMovePct) || candidate.risk.maxAdverseMovePct < 0) {
    throw new Error("OpportunityCandidate.risk.maxAdverseMovePct must be >= 0");
  }
  if (candidate.analysisOnly !== true) {
    throw new Error("OpportunityCandidate.analysisOnly must be true");
  }
  if (candidate.orderExecution !== "disabled") {
    throw new Error("OpportunityCandidate.orderExecution must be disabled");
  }
  assertSerializable(candidate, "OpportunityCandidate");
  return candidate;
}

export function serializeOpportunityCandidate(candidate: OpportunityCandidate): string {
  return JSON.stringify(ensureOpportunityCandidate(candidate));
}

export function deserializeOpportunityCandidate(raw: string): OpportunityCandidate {
  return ensureOpportunityCandidate(JSON.parse(raw) as OpportunityCandidate);
}
