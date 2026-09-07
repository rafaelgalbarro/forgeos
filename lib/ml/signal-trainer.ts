/**
 * Phase H — Own Machine Learning signal trainer (pure TypeScript logistic regression).
 *
 * - Stores signals + labeled outcomes under `.forgeos/ml/signals.jsonl`
 * - Trains after ≥ ML_MIN_SAMPLES (default 50) labeled outcomes
 * - Soft-adjusts scanner weights weekly → `.forgeos/ml/scanner-weights.json`
 * - ANALYSIS_ONLY safe: never places orders
 *
 * Storage: JSONL + model JSON (Windows-friendly). Upgrade path: same schema → SQLite.
 */

import "server-only";

import {
  appendSignalRecord,
  loadAllSignalRecords,
  loadModelState,
  loadScannerWeights,
  loadTrainMeta,
  newSignalId,
  rewriteSignalRecords,
  saveModelState,
  saveScannerWeights,
  saveTrainMeta,
} from "@/lib/ml/signal-store";
import type {
  MlLearningCurvePoint,
  MlLearningSnapshot,
  MlModelState,
  MlScannerWeights,
  MlSignalIndicators,
  MlSignalOutcome,
  MlSignalRecord,
  MlTrainStatus,
} from "@/lib/ml/types";

// ── Config ───────────────────────────────────────────────────────────────────

function envBool(name: string, defaultValue: boolean): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  if (!v) return defaultValue;
  return v === "true" || v === "1" || v === "yes";
}

function envNum(name: string, defaultValue: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return defaultValue;
  const n = Number(raw);
  return Number.isFinite(n) ? n : defaultValue;
}

export function isMlSignalTrainerEnabled(): boolean {
  return envBool("ML_SIGNAL_TRAINER_ENABLED", true);
}

export function mlMinSamples(): number {
  return Math.max(10, Math.floor(envNum("ML_MIN_SAMPLES", 50)));
}

/** Soft caps so ML cannot extreme-bias scanners. */
export const ML_WEIGHT_CAPS = { min: 0.85, max: 1.15 } as const;

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

const FEATURE_NAMES = [
  "bias_const", // unused in vector — bias separate; kept for docs
  "confidence",
  "rsi_norm",
  "rsi_oversold",
  "rsi_overbought",
  "squeeze",
  "volume_spike",
  "golden_cross",
  "death_cross",
  "hour_sin",
  "hour_cos",
  "vix_norm",
  "vix_in_optimal",
  "sector_tech",
  "sector_fin",
  "sector_energy",
  "sector_health",
  "sector_other",
  "has_pattern",
] as const;

type FeatureName = (typeof FEATURE_NAMES)[number];

// ── Helpers ──────────────────────────────────────────────────────────────────

function clampWeight(w: number): number {
  return Math.min(ML_WEIGHT_CAPS.max, Math.max(ML_WEIGHT_CAPS.min, w));
}

function sigmoid(z: number): number {
  if (z >= 20) return 1;
  if (z <= -20) return 0;
  return 1 / (1 + Math.exp(-z));
}

/** America/New_York hour 0–23 (best-effort; falls back to UTC). */
export function hourEtFromIso(iso: string): number {
  try {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      hour12: false,
    }).formatToParts(new Date(iso));
    const h = Number(parts.find((p) => p.type === "hour")?.value);
    return Number.isFinite(h) ? ((h % 24) + 24) % 24 : new Date(iso).getUTCHours();
  } catch {
    return new Date(iso).getUTCHours();
  }
}

function sectorBucket(sector: string | null | undefined): FeatureName {
  const s = (sector ?? "").toLowerCase();
  if (/tech|software|semiconductor|information/i.test(s)) return "sector_tech";
  if (/financ|bank|insur/i.test(s)) return "sector_fin";
  if (/energy|oil|gas/i.test(s)) return "sector_energy";
  if (/health|pharma|biotech/i.test(s)) return "sector_health";
  return "sector_other";
}

function buildFeatureVector(rec: MlSignalRecord): number[] {
  const ind = rec.indicators;
  const rsi = ind.rsi ?? 50;
  const vix = rec.vix ?? 20;
  const hour = rec.hourEt;
  const hourRad = (2 * Math.PI * hour) / 24;
  const bucket = sectorBucket(rec.sector);

  const vec: Record<string, number> = {
    confidence: Math.min(1, Math.max(0, rec.confidence)),
    rsi_norm: rsi / 100,
    rsi_oversold: (ind.rsiOversold || rsi < 30) ? 1 : 0,
    rsi_overbought: (ind.rsiOverbought || rsi > 70) ? 1 : 0,
    squeeze: ind.squeezeActive ? 1 : 0,
    volume_spike: (ind.volumeSpike || (ind.relativeVolume ?? 0) > 2) ? 1 : 0,
    golden_cross: ind.goldenCross ? 1 : 0,
    death_cross: ind.deathCross ? 1 : 0,
    hour_sin: Math.sin(hourRad),
    hour_cos: Math.cos(hourRad),
    vix_norm: Math.min(1, vix / 50),
    vix_in_optimal: vix >= 12 && vix <= 25 ? 1 : 0,
    sector_tech: bucket === "sector_tech" ? 1 : 0,
    sector_fin: bucket === "sector_fin" ? 1 : 0,
    sector_energy: bucket === "sector_energy" ? 1 : 0,
    sector_health: bucket === "sector_health" ? 1 : 0,
    sector_other: bucket === "sector_other" ? 1 : 0,
    has_pattern: rec.pattern ? 1 : 0,
  };

  // Exclude bias_const placeholder
  return FEATURE_NAMES.filter((n) => n !== "bias_const").map((n) => vec[n] ?? 0);
}

const VECTOR_FEATURE_NAMES = FEATURE_NAMES.filter((n) => n !== "bias_const");

function trainLogisticRegression(
  samples: readonly MlSignalRecord[],
  opts?: { epochs?: number; lr?: number },
): { weights: number[]; bias: number; loss: number } {
  const epochs = opts?.epochs ?? 400;
  const lr = opts?.lr ?? 0.08;
  const dim = VECTOR_FEATURE_NAMES.length;
  const weights = new Array(dim).fill(0);
  let bias = 0;

  const X = samples.map(buildFeatureVector);
  const y = samples.map((s) => (s.outcome?.win ? 1 : 0));

  let loss = 0;
  for (let epoch = 0; epoch < epochs; epoch++) {
    const gradW = new Array(dim).fill(0);
    let gradB = 0;
    loss = 0;
    for (let i = 0; i < X.length; i++) {
      const xi = X[i]!;
      let z = bias;
      for (let j = 0; j < dim; j++) z += weights[j]! * xi[j]!;
      const p = sigmoid(z);
      const err = p - y[i]!;
      loss += -(y[i]! * Math.log(p + 1e-9) + (1 - y[i]!) * Math.log(1 - p + 1e-9));
      for (let j = 0; j < dim; j++) gradW[j]! += err * xi[j]!;
      gradB += err;
    }
    loss /= X.length;
    for (let j = 0; j < dim; j++) weights[j]! -= (lr * gradW[j]!) / X.length;
    bias -= (lr * gradB) / X.length;
  }

  return { weights, bias, loss };
}

function buildLearningCurve(labeled: readonly MlSignalRecord[]): MlLearningCurvePoint[] {
  const sorted = [...labeled].sort((a, b) => {
    const ta = a.outcome?.labeledAt ?? a.recordedAt;
    const tb = b.outcome?.labeledAt ?? b.recordedAt;
    return ta.localeCompare(tb);
  });
  let wins = 0;
  const curve: MlLearningCurvePoint[] = [];
  sorted.forEach((rec, i) => {
    if (rec.outcome?.win) wins += 1;
    const n = i + 1;
    curve.push({
      index: i,
      winRatePct: Number(((wins / n) * 100).toFixed(2)),
      sampleCount: n,
      at: rec.outcome?.labeledAt ?? rec.recordedAt,
    });
  });
  // Downsample for UI if huge
  if (curve.length <= 80) return curve;
  const step = Math.ceil(curve.length / 80);
  const sampled = curve.filter((_, i) => i % step === 0 || i === curve.length - 1);
  return sampled;
}

function winRateByKey(
  labeled: readonly MlSignalRecord[],
  keyFn: (r: MlSignalRecord) => string,
): Map<string, { wins: number; n: number }> {
  const map = new Map<string, { wins: number; n: number }>();
  for (const r of labeled) {
    const k = keyFn(r);
    const cur = map.get(k) ?? { wins: 0, n: 0 };
    cur.n += 1;
    if (r.outcome?.win) cur.wins += 1;
    map.set(k, cur);
  }
  return map;
}

function rateToMultiplier(winRate: number, globalRate: number): number {
  if (!Number.isFinite(winRate) || !Number.isFinite(globalRate) || globalRate <= 0) return 1;
  // Soft pull toward empirical edge vs global
  const raw = 1 + (winRate - globalRate) * 0.5;
  return clampWeight(raw);
}

function deriveInsights(
  labeled: readonly MlSignalRecord[],
  weights: MlScannerWeights,
): string[] {
  const insights: string[] = [];
  const n = labeled.length;
  const wins = labeled.filter((r) => r.outcome?.win).length;
  const global = n > 0 ? wins / n : 0;
  insights.push(`Labeled samples: ${n} · win rate ${(global * 100).toFixed(1)}%`);

  const byHour = winRateByKey(labeled, (r) => String(r.hourEt));
  let bestHour = "";
  let bestHourRate = -1;
  for (const [h, v] of byHour) {
    if (v.n < 3) continue;
    const rate = v.wins / v.n;
    if (rate > bestHourRate) {
      bestHourRate = rate;
      bestHour = h;
    }
  }
  if (bestHour) {
    insights.push(
      `Best hour (ET): ${bestHour}:00 · win ${(bestHourRate * 100).toFixed(0)}% (weight ${weights.hourEt[bestHour]?.toFixed(2) ?? "1.00"})`,
    );
  }

  const bySector = winRateByKey(labeled, (r) => r.sector ?? "UNKNOWN");
  let bestSec = "";
  let bestSecRate = -1;
  for (const [s, v] of bySector) {
    if (v.n < 3 || s === "UNKNOWN") continue;
    const rate = v.wins / v.n;
    if (rate > bestSecRate) {
      bestSecRate = rate;
      bestSec = s;
    }
  }
  if (bestSec) {
    insights.push(
      `Strongest sector: ${bestSec} · win ${(bestSecRate * 100).toFixed(0)}% (weight ${weights.sector[bestSec]?.toFixed(2) ?? "1.00"})`,
    );
  }

  insights.push(
    `VIX sweet spot: ${weights.vix.optimalMin}–${weights.vix.optimalMax} (inside×${weights.vix.insideBoost.toFixed(2)}, outside×${weights.vix.outsidePenalty.toFixed(2)})`,
  );
  insights.push(
    `Indicator boosts: RSI OS×${weights.indicator.rsiOversold.toFixed(2)} · Squeeze×${weights.indicator.squeeze.toFixed(2)} · Golden×${weights.indicator.goldenCross.toFixed(2)}`,
  );
  insights.push("ANALYSIS_ONLY — ML never auto-places orders.");
  return insights;
}

function buildScannerWeightsFromLabeled(
  labeled: readonly MlSignalRecord[],
  modelVersion: number,
  modelInsights: readonly string[],
): MlScannerWeights {
  const n = labeled.length;
  const wins = labeled.filter((r) => r.outcome?.win).length;
  const global = n > 0 ? wins / n : 0.5;

  const flagRate = (pred: (r: MlSignalRecord) => boolean): number => {
    const subset = labeled.filter(pred);
    if (subset.length < 3) return global;
    return subset.filter((r) => r.outcome?.win).length / subset.length;
  };

  const indicator = {
    rsiOversold: rateToMultiplier(flagRate((r) => !!(r.indicators.rsiOversold || (r.indicators.rsi != null && r.indicators.rsi < 30))), global),
    rsiOverbought: rateToMultiplier(flagRate((r) => !!(r.indicators.rsiOverbought || (r.indicators.rsi != null && r.indicators.rsi > 70))), global),
    squeeze: rateToMultiplier(flagRate((r) => !!r.indicators.squeezeActive), global),
    goldenCross: rateToMultiplier(flagRate((r) => !!r.indicators.goldenCross), global),
    deathCross: rateToMultiplier(flagRate((r) => !!r.indicators.deathCross), global),
    volumeSpike: rateToMultiplier(flagRate((r) => !!(r.indicators.volumeSpike || (r.indicators.relativeVolume != null && r.indicators.relativeVolume > 2))), global),
    confidence: rateToMultiplier(flagRate((r) => r.confidence >= 0.7), global),
  };

  const hourEt: Record<string, number> = {};
  const byHour = winRateByKey(labeled, (r) => String(r.hourEt));
  for (let h = 0; h < 24; h++) {
    const key = String(h);
    const v = byHour.get(key);
    if (!v || v.n < 3) {
      hourEt[key] = 1;
    } else {
      hourEt[key] = rateToMultiplier(v.wins / v.n, global);
    }
  }

  const sector: Record<string, number> = {};
  const bySector = winRateByKey(labeled, (r) => r.sector ?? "UNKNOWN");
  for (const [s, v] of bySector) {
    if (s === "UNKNOWN" || v.n < 3) continue;
    sector[s] = rateToMultiplier(v.wins / v.n, global);
  }

  // Optimal VIX band: maximize win rate among buckets of width ~5
  const vixSamples = labeled.filter((r) => r.vix != null && Number.isFinite(r.vix));
  let optimalMin = 12;
  let optimalMax = 25;
  let bestBucketRate = -1;
  if (vixSamples.length >= 8) {
    for (let lo = 10; lo <= 30; lo += 2) {
      const hi = lo + 8;
      const bucket = vixSamples.filter((r) => (r.vix as number) >= lo && (r.vix as number) < hi);
      if (bucket.length < 4) continue;
      const rate = bucket.filter((r) => r.outcome?.win).length / bucket.length;
      if (rate > bestBucketRate) {
        bestBucketRate = rate;
        optimalMin = lo;
        optimalMax = hi;
      }
    }
  }
  const inside = vixSamples.filter((r) => (r.vix as number) >= optimalMin && (r.vix as number) <= optimalMax);
  const outside = vixSamples.filter((r) => (r.vix as number) < optimalMin || (r.vix as number) > optimalMax);
  const insideRate = inside.length >= 3 ? inside.filter((r) => r.outcome?.win).length / inside.length : global;
  const outsideRate = outside.length >= 3 ? outside.filter((r) => r.outcome?.win).length / outside.length : global;

  const draft: MlScannerWeights = {
    updatedAt: new Date().toISOString(),
    status: n >= mlMinSamples() ? "TRAINED" : "NOT_READY",
    sampleCount: n,
    modelVersion,
    caps: { ...ML_WEIGHT_CAPS },
    indicator,
    hourEt,
    sector,
    vix: {
      optimalMin,
      optimalMax,
      insideBoost: rateToMultiplier(insideRate, global),
      outsidePenalty: rateToMultiplier(outsideRate, global),
    },
    insights: [],
    storage: "jsonl",
    storageNote:
      "JSONL under .forgeos/ml/signals.jsonl + model.json. Upgrade path: import same MlSignalRecord schema into SQLite (better-sqlite3 / node:sqlite) without changing trainers.",
  };
  return {
    ...draft,
    insights: [...modelInsights, ...deriveInsights(labeled, draft)],
  };
}

// ── Public API ───────────────────────────────────────────────────────────────

export type RecordMlSignalInput = {
  readonly ticker: string;
  readonly direction: "BUY" | "SELL";
  readonly indicators?: MlSignalIndicators;
  readonly pattern?: string | null;
  readonly confidence: number;
  readonly sector?: string | null;
  readonly vix?: number | null;
  readonly source: MlSignalRecord["source"];
  readonly approvalId?: string | null;
  readonly recordedAt?: string;
};

/** Record an actionable signal for later outcome labeling. No-op when disabled. */
export function recordMlSignal(input: RecordMlSignalInput, cwd = process.cwd()): MlSignalRecord | null {
  if (!isMlSignalTrainerEnabled()) return null;
  const recordedAt = input.recordedAt ?? new Date().toISOString();
  const rsi = input.indicators?.rsi ?? null;
  const indicators: MlSignalIndicators = {
    ...input.indicators,
    rsi,
    rsiOversold: input.indicators?.rsiOversold ?? (rsi != null && rsi < 30),
    rsiOverbought: input.indicators?.rsiOverbought ?? (rsi != null && rsi > 70),
    volumeSpike:
      input.indicators?.volumeSpike ??
      (input.indicators?.relativeVolume != null && input.indicators.relativeVolume > 2),
  };
  const record: MlSignalRecord = {
    id: newSignalId(input.ticker, new Date(recordedAt)),
    ticker: input.ticker.toUpperCase(),
    direction: input.direction,
    indicators,
    pattern: input.pattern ?? null,
    confidence: Math.min(1, Math.max(0, input.confidence)),
    hourEt: hourEtFromIso(recordedAt),
    sector: input.sector ?? null,
    vix: input.vix ?? null,
    source: input.source,
    approvalId: input.approvalId ?? null,
    recordedAt,
    outcome: null,
  };
  try {
    appendSignalRecord(record, cwd);
    return record;
  } catch (err) {
    console.warn("[MlSignalTrainer] record failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export type LabelMlOutcomeInput = {
  readonly ticker: string;
  readonly pnlUSD: number;
  readonly pnlPct: number;
  readonly kind: MlSignalOutcome["kind"];
  readonly closedAt?: string;
  /** Prefer matching this approval / signal id when present. */
  readonly signalId?: string | null;
};

/**
 * Label the newest unlabeled signal for ticker (FIFO-open style).
 * Called from position-monitor on TP/SL close.
 */
export function labelMlSignalOutcome(input: LabelMlOutcomeInput, cwd = process.cwd()): boolean {
  if (!isMlSignalTrainerEnabled()) return false;
  try {
    const records = loadAllSignalRecords(cwd);
    const ticker = input.ticker.toUpperCase();
    const labeledAt = input.closedAt ?? new Date().toISOString();
    const outcome: MlSignalOutcome = {
      kind: input.kind,
      pnlUSD: input.pnlUSD,
      pnlPct: input.pnlPct,
      win: input.pnlUSD > 0 || input.pnlPct > 0,
      labeledAt,
    };

    let idx = -1;
    if (input.signalId) {
      idx = records.findIndex((r) => r.id === input.signalId && !r.outcome);
    }
    if (idx < 0) {
      // Newest unlabeled for ticker
      for (let i = records.length - 1; i >= 0; i--) {
        const r = records[i]!;
        if (r.ticker === ticker && !r.outcome) {
          idx = i;
          break;
        }
      }
    }
    if (idx < 0) return false;

    const next = records.slice();
    next[idx] = { ...next[idx]!, outcome };
    rewriteSignalRecords(next, cwd);
    return true;
  } catch (err) {
    console.warn("[MlSignalTrainer] label failed:", err instanceof Error ? err.message : err);
    return false;
  }
}

export type TrainResult = {
  readonly status: MlTrainStatus;
  readonly labeledCount: number;
  readonly trained: boolean;
  readonly modelVersion: number | null;
  readonly note: string;
  readonly weightsPath: string | null;
};

/** Train logistic regression if enough labeled samples. Always writes NOT_READY weights stub when short. */
export function trainSignalModel(cwd = process.cwd()): TrainResult {
  const min = mlMinSamples();
  const all = loadAllSignalRecords(cwd);
  const labeled = all.filter((r) => r.outcome != null);
  const meta = loadTrainMeta(cwd);

  if (labeled.length < min) {
    const stub: MlScannerWeights = {
      updatedAt: new Date().toISOString(),
      status: "NOT_READY",
      sampleCount: labeled.length,
      modelVersion: meta.modelVersion,
      caps: { ...ML_WEIGHT_CAPS },
      indicator: {
        rsiOversold: 1,
        rsiOverbought: 1,
        squeeze: 1,
        goldenCross: 1,
        deathCross: 1,
        volumeSpike: 1,
        confidence: 1,
      },
      hourEt: Object.fromEntries([...Array(24)].map((_, h) => [String(h), 1])),
      sector: {},
      vix: { optimalMin: 12, optimalMax: 25, insideBoost: 1, outsidePenalty: 1 },
      insights: [
        `NOT_READY — need ≥${min} labeled outcomes (have ${labeled.length}).`,
        "ANALYSIS_ONLY — ML never auto-places orders.",
      ],
      storage: "jsonl",
      storageNote:
        "JSONL under .forgeos/ml/. Upgrade path: same MlSignalRecord schema → SQLite.",
    };
    saveScannerWeights(stub, cwd);
    saveTrainMeta(
      { ...meta, lastTrainAttemptAt: new Date().toISOString() },
      cwd,
    );
    return {
      status: "NOT_READY",
      labeledCount: labeled.length,
      trained: false,
      modelVersion: null,
      note: stub.insights[0]!,
      weightsPath: ".forgeos/ml/scanner-weights.json",
    };
  }

  const { weights, bias, loss } = trainLogisticRegression(labeled);
  const version = meta.modelVersion + 1;
  const curve = buildLearningCurve(labeled);
  const model: MlModelState = {
    version,
    trainedAt: new Date().toISOString(),
    labeledCount: labeled.length,
    featureNames: [...VECTOR_FEATURE_NAMES],
    weights,
    bias,
    trainLoss: Number(loss.toFixed(6)),
    insights: [
      `Logistic regression trained on ${labeled.length} samples · loss=${loss.toFixed(4)}`,
    ],
    learningCurve: curve,
  };
  saveModelState(model, cwd);

  const scannerWeights = buildScannerWeightsFromLabeled(labeled, version, model.insights);
  saveScannerWeights(scannerWeights, cwd);
  saveTrainMeta(
    {
      lastTrainedAt: model.trainedAt,
      lastTrainAttemptAt: model.trainedAt,
      modelVersion: version,
    },
    cwd,
  );

  return {
    status: "TRAINED",
    labeledCount: labeled.length,
    trained: true,
    modelVersion: version,
    note: `Trained v${version} on ${labeled.length} samples.`,
    weightsPath: ".forgeos/ml/scanner-weights.json",
  };
}

/**
 * Weekly cadence hook — safe to call from reports-poll / maybeSendScheduledReports.
 * Retrains at most once per 7 days (or when never trained and samples ready).
 */
export function maybeRetrainWeekly(opts?: {
  readonly force?: boolean;
  readonly cwd?: string;
}): TrainResult {
  const cwd = opts?.cwd ?? process.cwd();
  if (!isMlSignalTrainerEnabled()) {
    return {
      status: "NOT_READY",
      labeledCount: 0,
      trained: false,
      modelVersion: null,
      note: "ML_SIGNAL_TRAINER_ENABLED=false",
      weightsPath: null,
    };
  }

  const meta = loadTrainMeta(cwd);
  const now = Date.now();
  const last =
    meta.lastTrainedAt != null
      ? Date.parse(meta.lastTrainedAt)
      : meta.lastTrainAttemptAt != null
        ? Date.parse(meta.lastTrainAttemptAt)
        : 0;
  const due = opts?.force || !last || now - last >= WEEK_MS;
  if (!due) {
    const labeled = loadAllSignalRecords(cwd).filter((r) => r.outcome != null).length;
    return {
      status: labeled >= mlMinSamples() ? "TRAINED" : "NOT_READY",
      labeledCount: labeled,
      trained: false,
      modelVersion: meta.modelVersion || null,
      note: `Weekly retrain not due (last ${meta.lastTrainedAt ?? meta.lastTrainAttemptAt}).`,
      weightsPath: ".forgeos/ml/scanner-weights.json",
    };
  }

  return trainSignalModel(cwd);
}

export function getMlLearningSnapshot(cwd = process.cwd()): MlLearningSnapshot {
  const enabled = isMlSignalTrainerEnabled();
  const min = mlMinSamples();
  const all = enabled ? loadAllSignalRecords(cwd) : [];
  const labeled = all.filter((r) => r.outcome != null);
  const model = enabled ? loadModelState(cwd) : null;
  const weights = enabled ? loadScannerWeights(cwd) : null;
  const meta = enabled ? loadTrainMeta(cwd) : { lastTrainedAt: null, lastTrainAttemptAt: null, modelVersion: 0 };

  let status: MlTrainStatus = "NOT_READY";
  if (!enabled) status = "NOT_READY";
  else if (model && labeled.length >= min) status = "TRAINED";
  else if (labeled.length >= min) status = "READY";
  else status = "NOT_READY";

  const curve = model?.learningCurve?.length
    ? model.learningCurve
    : buildLearningCurve(labeled);

  const insights =
    weights?.insights?.length
      ? weights.insights
      : status === "NOT_READY"
        ? [
            `NOT_READY — need ≥${min} labeled outcomes (have ${labeled.length}).`,
            "ANALYSIS_ONLY — ML never auto-places orders.",
          ]
        : ["Samples ready — awaiting weekly train."];

  return {
    enabled,
    status,
    minSamples: min,
    labeledCount: labeled.length,
    totalSignals: all.length,
    lastTrainedAt: meta.lastTrainedAt ?? model?.trainedAt ?? null,
    modelVersion: model?.version ?? (meta.modelVersion || null),
    learningCurve: curve,
    insights,
    weightCaps: { ...ML_WEIGHT_CAPS },
    note:
      status === "NOT_READY"
        ? `Collecting paper outcomes (${labeled.length}/${min}).`
        : status === "READY"
          ? "Ready to train — call maybeRetrainWeekly()."
          : `Model v${model?.version ?? "?"} · soft scanner weights capped [${ML_WEIGHT_CAPS.min}, ${ML_WEIGHT_CAPS.max}].`,
    orderExecution: "disabled",
    mode: "ANALYSIS_ONLY",
  };
}

/**
 * Soft score multiplier for scanners (capped). Returns 1 when disabled / NOT_READY.
 * Never blocks trades — advisory reweight only.
 */
export function applyMlScannerScoreMultiplier(args: {
  readonly baseScore: number;
  readonly hourEt?: number;
  readonly sector?: string | null;
  readonly vix?: number | null;
  readonly flags?: {
    readonly rsiOversold?: boolean;
    readonly rsiOverbought?: boolean;
    readonly squeeze?: boolean;
    readonly goldenCross?: boolean;
    readonly deathCross?: boolean;
    readonly volumeSpike?: boolean;
  };
  readonly cwd?: string;
}): number {
  if (!isMlSignalTrainerEnabled()) return args.baseScore;
  const weights = loadScannerWeights(args.cwd);
  if (!weights || weights.status === "NOT_READY") return args.baseScore;

  let m = 1;
  const f = args.flags;
  if (f?.rsiOversold) m *= weights.indicator.rsiOversold;
  if (f?.rsiOverbought) m *= weights.indicator.rsiOverbought;
  if (f?.squeeze) m *= weights.indicator.squeeze;
  if (f?.goldenCross) m *= weights.indicator.goldenCross;
  if (f?.deathCross) m *= weights.indicator.deathCross;
  if (f?.volumeSpike) m *= weights.indicator.volumeSpike;

  if (args.hourEt != null) {
    m *= weights.hourEt[String(args.hourEt)] ?? 1;
  }
  if (args.sector && weights.sector[args.sector] != null) {
    m *= weights.sector[args.sector]!;
  }
  if (args.vix != null && Number.isFinite(args.vix)) {
    const inside = args.vix >= weights.vix.optimalMin && args.vix <= weights.vix.optimalMax;
    m *= inside ? weights.vix.insideBoost : weights.vix.outsidePenalty;
  }

  // Cap cumulative multiplier too
  const capped = clampWeight(m);
  return Math.min(100, Math.max(0, Math.round(args.baseScore * capped)));
}

/** Read weights for optional consumers (market-scanner / enhanced scan). */
export function getActiveScannerWeights(cwd = process.cwd()): MlScannerWeights | null {
  if (!isMlSignalTrainerEnabled()) return null;
  const w = loadScannerWeights(cwd);
  if (!w || w.status === "NOT_READY") return null;
  return w;
}
