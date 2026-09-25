import { assertConfidence, assertNonEmpty, assertSerializable } from "../domain/guards";
import type { SessionPhase } from "../live-runtime/types";

export type OpportunityAssetClass =
  | "stocks"
  | "etf"
  | "forex"
  | "futures"
  | "options"
  | "bonds"
  | "commodities"
  | "crypto";

export type OpportunityStrategy =
  | "trend-scanner"
  | "mean-reversion"
  | "breakout"
  | "momentum"
  | "volatility"
  | "anomalous-volume"
  | "gaps"
  | "corporate-events"
  | "news"
  | "correlations"
  | "statistical-arbitrage"
  | "macro-changes"
  | "portfolio-imbalance";

export type OpportunityDirection = "long" | "short" | "neutral";

export type OpportunityDiscardReason =
  | "stale-data"
  | "missing-bid-ask"
  | "spread-too-wide"
  | "unauthorized-asset"
  | "market-data-unavailable"
  | "session-unavailable"
  | "signal-not-strong-enough"
  | "duplicate-signal"
  | "cooldown-active";

export type FreshnessState = "fresh" | "aging" | "stale" | "unknown";

export interface OpportunityInstrument {
  readonly id: string;
  readonly symbol: string;
  readonly conId: number;
  readonly market: string;
  readonly currency: string;
  readonly assetClass: OpportunityAssetClass;
  readonly region: string;
  readonly broker: string;
  readonly accountId: string;
  readonly cryptoAllowed: boolean;
}

export interface OpportunityCandidate {
  readonly id: string;
  readonly instrument: string;
  readonly conId: number;
  readonly market: string;
  readonly currency: string;
  readonly strategy: OpportunityStrategy;
  readonly direction: OpportunityDirection;
  readonly timeframe: string;
  readonly detectedAt: string;
  readonly marketSession: SessionPhase;
  readonly entryZone: {
    readonly from: number;
    readonly to: number;
  };
  readonly invalidationLevel: number;
  readonly initialStop: number;
  readonly initialTarget: number;
  readonly estimatedSpread: number;
  readonly estimatedSlippage: number;
  readonly liquidityScore: number;
  readonly confidence: number;
  readonly evidence: readonly string[];
  readonly dataFreshness: FreshnessState;
  readonly expiresAt: string;
}

export interface AcceptedOpportunityRecord {
  readonly type: "accepted";
  readonly candidate: OpportunityCandidate;
  readonly recordedAt: string;
  readonly reasons: readonly string[];
}

export interface DiscardedOpportunityRecord {
  readonly type: "discarded";
  readonly strategy: OpportunityStrategy;
  readonly instrument: string;
  readonly conId: number;
  readonly detectedAt: string;
  readonly reason: OpportunityDiscardReason;
  readonly detail: string;
  readonly evidence: readonly string[];
}

export interface OpportunityScannerPolicy {
  readonly maxDataAgeMs: number;
  readonly maxSpreadByAssetClass: Readonly<Record<OpportunityAssetClass, number>>;
  readonly cooldownMsByStrategy: Readonly<Record<OpportunityStrategy, number>>;
  readonly dedupeTtlMs: number;
  readonly minConfidence: number;
  readonly defaultTimeframe: string;
}

export function defaultOpportunityScannerPolicy(): OpportunityScannerPolicy {
  return {
    maxDataAgeMs: 30_000,
    maxSpreadByAssetClass: {
      stocks: 0.025,
      etf: 0.025,
      forex: 0.002,
      futures: 0.02,
      options: 0.05,
      bonds: 0.03,
      commodities: 0.03,
      crypto: 0.04,
    },
    cooldownMsByStrategy: {
      "trend-scanner": 60_000,
      "mean-reversion": 90_000,
      breakout: 120_000,
      momentum: 60_000,
      volatility: 90_000,
      "anomalous-volume": 120_000,
      gaps: 180_000,
      "corporate-events": 300_000,
      news: 300_000,
      correlations: 120_000,
      "statistical-arbitrage": 180_000,
      "macro-changes": 300_000,
      "portfolio-imbalance": 180_000,
    },
    dedupeTtlMs: 120_000,
    minConfidence: 0.55,
    defaultTimeframe: "15m",
  };
}

export function ensureOpportunityCandidate(candidate: OpportunityCandidate): OpportunityCandidate {
  assertNonEmpty(candidate.id, "OpportunityCandidate.id");
  assertNonEmpty(candidate.instrument, "OpportunityCandidate.instrument");
  assertNonEmpty(candidate.market, "OpportunityCandidate.market");
  assertNonEmpty(candidate.currency, "OpportunityCandidate.currency");
  assertNonEmpty(candidate.detectedAt, "OpportunityCandidate.detectedAt");
  assertNonEmpty(candidate.timeframe, "OpportunityCandidate.timeframe");
  assertNonEmpty(candidate.expiresAt, "OpportunityCandidate.expiresAt");
  if (!Number.isFinite(candidate.conId) || candidate.conId <= 0) {
    throw new Error("OpportunityCandidate.conId must be > 0");
  }
  if (!Number.isFinite(candidate.entryZone.from) || !Number.isFinite(candidate.entryZone.to)) {
    throw new Error("OpportunityCandidate.entryZone must be finite");
  }
  if (!Number.isFinite(candidate.initialStop) || !Number.isFinite(candidate.initialTarget)) {
    throw new Error("OpportunityCandidate.initialStop/initialTarget must be finite");
  }
  if (!Number.isFinite(candidate.invalidationLevel)) {
    throw new Error("OpportunityCandidate.invalidationLevel must be finite");
  }
  if (!Number.isFinite(candidate.estimatedSpread) || candidate.estimatedSpread < 0) {
    throw new Error("OpportunityCandidate.estimatedSpread must be >= 0");
  }
  if (!Number.isFinite(candidate.estimatedSlippage) || candidate.estimatedSlippage < 0) {
    throw new Error("OpportunityCandidate.estimatedSlippage must be >= 0");
  }
  assertConfidence(candidate.liquidityScore, "OpportunityCandidate.liquidityScore");
  assertConfidence(candidate.confidence, "OpportunityCandidate.confidence");
  if (candidate.evidence.length === 0) {
    throw new Error("OpportunityCandidate.evidence cannot be empty");
  }
  assertSerializable(candidate, "OpportunityCandidate");
  return candidate;
}
