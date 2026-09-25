import { assertConfidence, assertNonEmpty, assertSerializable, type SerializableValue } from "../../domain/guards";

export type ProviderKind = "market" | "news" | "economic" | "sentiment";

export interface ProviderHealth {
  readonly providerId: string;
  readonly kind: ProviderKind;
  readonly ok: boolean;
  readonly message?: string;
}

export interface ProviderError {
  readonly providerId: string;
  readonly kind: ProviderKind;
  readonly message: string;
}

export interface MarketQuote {
  readonly symbol: string;
  readonly price: number;
  readonly currency: string;
  readonly timestamp: string;
  readonly providerId: string;
}

export interface TimeSeriesPoint {
  readonly timestamp: string;
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume?: number;
}

export interface MarketTimeSeries {
  readonly symbol: string;
  readonly interval: string;
  readonly points: readonly TimeSeriesPoint[];
  readonly providerId: string;
}

export interface MarketSnapshot {
  readonly symbol: string;
  readonly quote?: MarketQuote;
  readonly timeSeries?: MarketTimeSeries;
  /** Optional — only when a provider returns a classified instrument type. Never invent. */
  readonly assetClass?: string;
  readonly capturedAt: string;
  readonly providerId: string;
}

export interface EconomicIndicator {
  readonly key: string;
  readonly label: string;
  readonly value: number;
  readonly unit?: string;
  readonly period: string;
  readonly providerId: string;
}

export interface NewsItem {
  readonly id: string;
  readonly title: string;
  readonly summary?: string;
  readonly url: string;
  readonly publishedAt: string;
  readonly source: string;
  readonly providerId: string;
  readonly symbols?: readonly string[];
}

export interface SentimentSignal {
  readonly signalId: string;
  readonly target: string;
  readonly score: number;
  readonly confidence: number;
  readonly rationale?: string;
  readonly providerId: string;
  readonly timestamp: string;
}

export interface MarketIntelligenceRequest {
  readonly symbols: readonly string[];
  readonly interval?: string;
  readonly from?: string;
  readonly to?: string;
  readonly economicKeys?: readonly string[];
  readonly limitNewsItems?: number;
}

export interface MarketIntelligenceResult {
  readonly generatedAt: string;
  readonly request: MarketIntelligenceRequest;
  readonly marketSnapshots: readonly MarketSnapshot[];
  readonly economicIndicators: readonly EconomicIndicator[];
  readonly news: readonly NewsItem[];
  readonly sentiment: readonly SentimentSignal[];
  readonly providersUsed: readonly string[];
  readonly health: readonly ProviderHealth[];
  readonly errors: readonly ProviderError[];
}

export function ensureSentimentSignal(signal: SentimentSignal): SentimentSignal {
  assertNonEmpty(signal.signalId, "SentimentSignal.signalId");
  assertNonEmpty(signal.target, "SentimentSignal.target");
  assertConfidence(signal.confidence, "SentimentSignal.confidence");
  if (!Number.isFinite(signal.score) || signal.score < -1 || signal.score > 1) {
    throw new Error("SentimentSignal.score must be between -1 and 1");
  }
  assertSerializable(signal, "SentimentSignal");
  return signal;
}

export function ensureSerializableOutput(value: MarketIntelligenceResult): MarketIntelligenceResult {
  assertSerializable(value as unknown as SerializableValue, "MarketIntelligenceOutput");
  return value;
}
