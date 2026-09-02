import type { RiskLevel } from "../../domain/entities";
import {
  defaultOpportunityCapabilityFlags,
  ensureOpportunityCandidate,
  type OpportunityAssetClass,
  type OpportunityCandidate,
  type OpportunityCapabilityFlags,
  type OpportunityScanResult,
} from "../domain";
import { runContextDetectors, runPriceDetectors } from "./detection-rules";
import {
  isAssetClassSupported,
  type DetectionSignal,
  type OpportunityContextPort,
  type OpportunityMarketDataPort,
  type OpportunityScanContext,
  type OpportunityUniversePort,
} from "./ports";

export interface OpportunityScannerDeps {
  readonly universe: OpportunityUniversePort;
  readonly marketData: OpportunityMarketDataPort;
  readonly context?: OpportunityContextPort;
  readonly capabilities?: Partial<OpportunityCapabilityFlags>;
  readonly now?: () => Date;
  readonly minConfidence?: number;
  readonly minScore?: number;
}

function riskLevel(maxAdverseMovePct: number, eventRisk: number): RiskLevel {
  const blended = maxAdverseMovePct / 100 + eventRisk;
  if (blended >= 0.55) return "high";
  if (blended >= 0.28) return "medium";
  return "low";
}

function liquidityRisk(signal: DetectionSignal, last: number, bid?: number, ask?: number): number {
  if (bid == null || ask == null || last <= 0) return 0.35;
  const spreadPct = Math.max(0, ask - bid) / last;
  return Math.min(1, Number((spreadPct * 40 + signal.eventRisk * 0.2).toFixed(6)));
}

function toCandidate(
  instrument: OpportunityScanContext["snapshots"][number]["instrument"],
  snapshot: OpportunityScanContext["snapshots"][number],
  signal: DetectionSignal,
  context: OpportunityScanContext,
): OpportunityCandidate {
  const nowMs = Date.parse(context.nowIso);
  return ensureOpportunityCandidate({
    id: `${instrument.id}:${signal.detection}:${nowMs}`,
    instrument,
    detection: signal.detection,
    direction: signal.direction,
    timeframe: signal.timeframe,
    score: signal.score,
    confidence: Number(signal.confidence.toFixed(6)),
    evidence: signal.evidence,
    risk: {
      level: riskLevel(signal.maxAdverseMovePct, signal.eventRisk),
      factors: [...signal.riskFactors],
      maxAdverseMovePct: signal.maxAdverseMovePct,
      liquidityRisk: liquidityRisk(signal, snapshot.last, snapshot.bid, snapshot.ask),
      eventRisk: Number(signal.eventRisk.toFixed(6)),
    },
    entryZone: { from: signal.entryFrom, to: signal.entryTo },
    stop: signal.stop,
    target: signal.target,
    marketRegime: context.marketRegime,
    expiry: new Date(nowMs + Math.max(60_000, signal.expiryMs)).toISOString(),
    detectedAt: context.nowIso,
    priceSource: snapshot.providerId,
    priceCapturedAt: snapshot.capturedAt,
    priceQuality: snapshot.providerId === "demo-synthetic-normalized" ? "DEMO" : "REAL",
    analysisOnly: true,
    orderExecution: "disabled",
  });
}

/**
 * Institutional continuous opportunity scanner.
 * Analysis-only: produces candidates with score/confidence/evidence/risk — never sends orders.
 */
export class OpportunityScanner {
  private readonly capabilities: OpportunityCapabilityFlags;
  private readonly now: () => Date;
  private readonly minConfidence: number;
  private readonly minScore: number;

  constructor(private readonly deps: OpportunityScannerDeps) {
    this.capabilities = defaultOpportunityCapabilityFlags(deps.capabilities);
    this.now = deps.now ?? (() => new Date());
    this.minConfidence = deps.minConfidence ?? 0.45;
    this.minScore = deps.minScore ?? 40;
  }

  getCapabilities(): OpportunityCapabilityFlags {
    return this.capabilities;
  }

  async scan(): Promise<OpportunityScanResult> {
    const started = Date.now();
    const nowIso = this.now().toISOString();
    const instruments = await this.deps.universe.listInstruments(this.capabilities);
    const supported = instruments.filter((item) => isAssetClassSupported(item.assetClass, this.capabilities));
    const skippedAssetClasses = Array.from(
      new Set(
        (Object.keys(this.capabilities) as OpportunityAssetClass[]).filter(
          (assetClass) => !this.capabilities[assetClass],
        ),
      ),
    );

    const snapshots = await this.deps.marketData.getSnapshots(supported);
    const enriched = this.deps.context
      ? await this.deps.context.loadContext(snapshots, nowIso)
      : {};

    const context: OpportunityScanContext = {
      snapshots,
      relative: enriched.relative,
      sectors: enriched.sectors,
      geography: enriched.geography,
      correlations: enriched.correlations,
      macroEvents: enriched.macroEvents,
      news: enriched.news,
      earnings: enriched.earnings,
      marketRegime: enriched.marketRegime ?? "sideways",
      nowIso,
      capabilities: this.capabilities,
    };

    const candidates: OpportunityCandidate[] = [];

    for (const snapshot of snapshots) {
      if (!isAssetClassSupported(snapshot.instrument.assetClass, this.capabilities)) continue;
      for (const signal of runPriceDetectors(snapshot)) {
        if (signal.confidence < this.minConfidence || signal.score < this.minScore) continue;
        candidates.push(toCandidate(snapshot.instrument, snapshot, signal, context));
      }
    }

    for (const signal of runContextDetectors(context)) {
      if (signal.confidence < this.minConfidence || signal.score < this.minScore) continue;
      const snapshot =
        context.snapshots.find((item) =>
          signal.evidence.some((ev) => ev.detail.includes(item.instrument.symbol)),
        ) ?? context.snapshots[0];
      if (!snapshot) continue;
      if (!isAssetClassSupported(snapshot.instrument.assetClass, this.capabilities)) continue;
      candidates.push(toCandidate(snapshot.instrument, snapshot, signal, context));
    }

    candidates.sort((a, b) => b.score - a.score || b.confidence - a.confidence);

    return {
      scannedAt: nowIso,
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      candidates,
      skippedAssetClasses,
      scanDurationMs: Date.now() - started,
    };
  }
}
