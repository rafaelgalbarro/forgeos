/**
 * Phase H — ML signal trainer types (client + server safe).
 * ANALYSIS_ONLY: never triggers order placement.
 */

export type MlSignalIndicators = {
  readonly rsi?: number | null;
  readonly squeezeActive?: boolean;
  readonly relativeVolume?: number | null;
  readonly macdHist?: number | null;
  readonly adx?: number | null;
  readonly goldenCross?: boolean;
  readonly deathCross?: boolean;
  readonly rsiOversold?: boolean;
  readonly rsiOverbought?: boolean;
  readonly volumeSpike?: boolean;
};

export type MlSignalOutcome = {
  readonly kind: "TP" | "SL" | "MANUAL" | "PAPER";
  readonly pnlUSD: number;
  readonly pnlPct: number;
  readonly win: boolean;
  readonly labeledAt: string;
};

/** One stored training sample (JSONL line under `.forgeos/ml/signals.jsonl`). */
export type MlSignalRecord = {
  readonly id: string;
  readonly ticker: string;
  readonly direction: "BUY" | "SELL";
  readonly indicators: MlSignalIndicators;
  readonly pattern: string | null;
  readonly confidence: number;
  /** Hour of day (0–23) in America/New_York when signal was emitted. */
  readonly hourEt: number;
  readonly sector: string | null;
  readonly vix: number | null;
  readonly source: "trading-engine" | "market-scanner" | "enhanced-scan";
  readonly approvalId?: string | null;
  readonly recordedAt: string;
  readonly outcome: MlSignalOutcome | null;
};

export type MlTrainStatus = "NOT_READY" | "READY" | "TRAINED";

export type MlLearningCurvePoint = {
  readonly index: number;
  /** Rolling win rate 0–100 after this labeled sample. */
  readonly winRatePct: number;
  readonly sampleCount: number;
  readonly at: string;
};

export type MlLearningSnapshot = {
  readonly enabled: boolean;
  readonly status: MlTrainStatus;
  readonly minSamples: number;
  readonly labeledCount: number;
  readonly totalSignals: number;
  readonly lastTrainedAt: string | null;
  readonly modelVersion: number | null;
  readonly learningCurve: readonly MlLearningCurvePoint[];
  readonly insights: readonly string[];
  readonly weightCaps: { readonly min: number; readonly max: number };
  readonly note: string;
  readonly orderExecution: "disabled";
  readonly mode: "ANALYSIS_ONLY";
};

/** Soft scanner multipliers — never extreme-bias (capped). */
export type MlScannerWeights = {
  readonly updatedAt: string;
  readonly status: MlTrainStatus;
  readonly sampleCount: number;
  readonly modelVersion: number;
  readonly caps: { readonly min: number; readonly max: number };
  /** Multipliers applied to score contributions (default 1). */
  readonly indicator: {
    readonly rsiOversold: number;
    readonly rsiOverbought: number;
    readonly squeeze: number;
    readonly goldenCross: number;
    readonly deathCross: number;
    readonly volumeSpike: number;
    readonly confidence: number;
  };
  /** Hour-of-day (ET) multipliers keyed as "0"…"23". */
  readonly hourEt: Readonly<Record<string, number>>;
  /** Sector name → multiplier. */
  readonly sector: Readonly<Record<string, number>>;
  readonly vix: {
    readonly optimalMin: number;
    readonly optimalMax: number;
    readonly insideBoost: number;
    readonly outsidePenalty: number;
  };
  readonly insights: readonly string[];
  /** Upgrade path note for future SQLite backend. */
  readonly storage: "jsonl";
  readonly storageNote: string;
};

export type MlModelState = {
  readonly version: number;
  readonly trainedAt: string;
  readonly labeledCount: number;
  readonly featureNames: readonly string[];
  readonly weights: readonly number[];
  readonly bias: number;
  readonly trainLoss: number;
  readonly insights: readonly string[];
  readonly learningCurve: readonly MlLearningCurvePoint[];
};
