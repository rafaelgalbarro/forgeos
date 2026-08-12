import type { MarketRegime } from "../../domain/entities";
import type {
  OpportunityAssetClass,
  OpportunityCapabilityFlags,
  OpportunityDetectionKind,
  OpportunityDirection,
  OpportunityEvidenceItem,
  OpportunityInstrumentMeta,
} from "../domain";

/** Normalized market bar/quote snapshot — never broker-coupled. */
export interface OpportunityMarketBar {
  readonly open: number;
  readonly high: number;
  readonly low: number;
  readonly close: number;
  readonly volume: number;
  readonly timestamp: string;
}

export interface OpportunityMarketSnapshot {
  readonly instrument: OpportunityInstrumentMeta;
  readonly last: number;
  readonly bid?: number;
  readonly ask?: number;
  readonly previousClose?: number;
  readonly averageVolume?: number;
  readonly atr?: number;
  readonly bars: readonly OpportunityMarketBar[];
  readonly capturedAt: string;
  readonly providerId: string;
}

export interface OpportunityRelativeContext {
  readonly instrumentSymbol: string;
  readonly benchmarkSymbol: string;
  readonly instrumentReturn: number;
  readonly benchmarkReturn: number;
  readonly relativeStrength: number;
}

export interface OpportunitySectorContext {
  readonly sector: string;
  readonly sectorReturn: number;
  readonly marketReturn: number;
  readonly rotationScore: number;
}

export interface OpportunityGeoContext {
  readonly region: string;
  readonly regionReturn: number;
  readonly globalReturn: number;
  readonly rotationScore: number;
}

export interface OpportunityCorrelationContext {
  readonly pairSymbol: string;
  readonly correlation: number;
  readonly lookback: string;
}

export interface OpportunityMacroEvent {
  readonly id: string;
  readonly title: string;
  readonly severity: number;
  readonly scheduledAt: string;
  readonly regions?: readonly string[];
}

export interface OpportunityNewsItem {
  readonly id: string;
  readonly headline: string;
  readonly sentiment: number;
  readonly publishedAt: string;
  readonly symbols: readonly string[];
}

export interface OpportunityEarningsEvent {
  readonly symbol: string;
  readonly reportDate: string;
  readonly surprisePct?: number;
  readonly expectedMovePct?: number;
}

export interface OpportunityScanContext {
  readonly snapshots: readonly OpportunityMarketSnapshot[];
  readonly relative?: readonly OpportunityRelativeContext[];
  readonly sectors?: readonly OpportunitySectorContext[];
  readonly geography?: readonly OpportunityGeoContext[];
  readonly correlations?: readonly OpportunityCorrelationContext[];
  readonly macroEvents?: readonly OpportunityMacroEvent[];
  readonly news?: readonly OpportunityNewsItem[];
  readonly earnings?: readonly OpportunityEarningsEvent[];
  readonly marketRegime: MarketRegime;
  readonly nowIso: string;
  readonly capabilities: OpportunityCapabilityFlags;
}

export interface OpportunityMarketDataPort {
  getSnapshots(instruments: readonly OpportunityInstrumentMeta[]): Promise<readonly OpportunityMarketSnapshot[]>;
}

export interface OpportunityUniversePort {
  listInstruments(capabilities: OpportunityCapabilityFlags): Promise<readonly OpportunityInstrumentMeta[]>;
}

export interface OpportunityContextPort {
  loadContext(
    snapshots: readonly OpportunityMarketSnapshot[],
    nowIso: string,
  ): Promise<Omit<OpportunityScanContext, "snapshots" | "nowIso" | "capabilities" | "marketRegime"> & {
    marketRegime?: MarketRegime;
  }>;
}

export interface DetectionSignal {
  readonly detection: OpportunityDetectionKind;
  readonly direction: OpportunityDirection;
  readonly score: number;
  readonly confidence: number;
  readonly evidence: readonly OpportunityEvidenceItem[];
  readonly riskFactors: readonly string[];
  readonly maxAdverseMovePct: number;
  readonly eventRisk: number;
  readonly entryFrom: number;
  readonly entryTo: number;
  readonly stop: number;
  readonly target: number;
  readonly expiryMs: number;
  readonly timeframe: string;
}

export function isAssetClassSupported(
  assetClass: OpportunityAssetClass,
  capabilities: OpportunityCapabilityFlags,
): boolean {
  return capabilities[assetClass] === true;
}
