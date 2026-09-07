import type { SessionPhase } from "../live-runtime/types";
import {
  defaultOpportunityScannerPolicy,
  ensureOpportunityCandidate,
  type AcceptedOpportunityRecord,
  type DiscardedOpportunityRecord,
  type FreshnessState,
  type OpportunityCandidate,
  type OpportunityDiscardReason,
  type OpportunityDirection,
  type OpportunityInstrument,
  type OpportunityScannerPolicy,
  type OpportunityStrategy,
} from "./domain";

export interface OpportunityMarketSnapshot {
  readonly bid?: number;
  readonly ask?: number;
  readonly last: number;
  readonly previousClose?: number;
  readonly volume?: number;
  readonly averageVolume?: number;
  readonly volatility?: number;
  readonly momentum?: number;
  readonly trend?: number;
  readonly correlation?: number;
  readonly macroScore?: number;
  readonly capturedAt: string;
}

export interface OpportunityCalendarSession {
  readonly phase: SessionPhase;
  readonly isOpen: boolean;
  readonly opensAt?: string;
  readonly closesAt?: string;
}

export interface OpportunityInstrumentUniverseProvider {
  listAuthorizedInstruments(): Promise<readonly OpportunityInstrument[]>;
}

export interface OpportunityMarketDataProvider {
  getSnapshot(instrument: OpportunityInstrument): Promise<OpportunityMarketSnapshot | null>;
}

export interface OpportunityCalendarProvider {
  getSession(instrument: OpportunityInstrument, atIso: string): Promise<OpportunityCalendarSession | null>;
}

export interface OpportunityNewsProvider {
  getHeadlines(instrument: OpportunityInstrument): Promise<readonly string[]>;
}

export interface OpportunityEventsProvider {
  getCorporateEvents(instrument: OpportunityInstrument): Promise<readonly string[]>;
}

export interface OpportunityPortfolioContextProvider {
  getImbalanceScore(instrument: OpportunityInstrument): Promise<number>;
}

export interface OpportunityScanSnapshot {
  readonly scannerStartedAt: string | null;
  readonly scannerRunning: boolean;
  readonly accepted: readonly AcceptedOpportunityRecord[];
  readonly discarded: readonly DiscardedOpportunityRecord[];
  readonly scanCount: number;
  readonly lastScanAt: string | null;
}

interface OpportunitySignal {
  readonly strategy: OpportunityStrategy;
  readonly direction: OpportunityDirection;
  readonly confidence: number;
  readonly evidence: readonly string[];
}

export interface OpportunityScannerDeps {
  readonly instruments: OpportunityInstrumentUniverseProvider;
  readonly marketData: OpportunityMarketDataProvider;
  readonly calendar: OpportunityCalendarProvider;
  readonly news?: OpportunityNewsProvider;
  readonly events?: OpportunityEventsProvider;
  readonly portfolio?: OpportunityPortfolioContextProvider;
  readonly now?: () => Date;
  readonly policy?: Partial<OpportunityScannerPolicy>;
  readonly pollIntervalMs?: number;
}

function mergePolicy(policy?: Partial<OpportunityScannerPolicy>): OpportunityScannerPolicy {
  const base = defaultOpportunityScannerPolicy();
  return {
    ...base,
    ...policy,
    maxSpreadByAssetClass: {
      ...base.maxSpreadByAssetClass,
      ...(policy?.maxSpreadByAssetClass ?? {}),
    },
    cooldownMsByStrategy: {
      ...base.cooldownMsByStrategy,
      ...(policy?.cooldownMsByStrategy ?? {}),
    },
  };
}

class DedupeCooldownManager {
  private readonly dedupeSeenAt = new Map<string, number>();
  private readonly cooldownUntil = new Map<string, number>();

  constructor(private readonly policy: OpportunityScannerPolicy) {}

  dedupeKey(instrument: OpportunityInstrument, signal: OpportunitySignal): string {
    return `${instrument.conId}:${signal.strategy}:${signal.direction}`;
  }

  cooldownKey(instrument: OpportunityInstrument, signal: OpportunitySignal): string {
    return `${instrument.conId}:${signal.strategy}`;
  }

  checkDuplicate(dedupeKey: string, nowMs: number): boolean {
    const seenAt = this.dedupeSeenAt.get(dedupeKey);
    if (seenAt == null) return false;
    return nowMs - seenAt < this.policy.dedupeTtlMs;
  }

  checkCooldown(cooldownKey: string, nowMs: number): boolean {
    const until = this.cooldownUntil.get(cooldownKey);
    if (until == null) return false;
    return nowMs < until;
  }

  markAccepted(instrument: OpportunityInstrument, signal: OpportunitySignal, nowMs: number): void {
    const dedupeKey = this.dedupeKey(instrument, signal);
    const cooldownKey = this.cooldownKey(instrument, signal);
    this.dedupeSeenAt.set(dedupeKey, nowMs);
    this.cooldownUntil.set(cooldownKey, nowMs + this.policy.cooldownMsByStrategy[signal.strategy]);
    this.compact(nowMs);
  }

  private compact(nowMs: number): void {
    for (const [key, seenAt] of this.dedupeSeenAt.entries()) {
      if (nowMs - seenAt > this.policy.dedupeTtlMs * 2) this.dedupeSeenAt.delete(key);
    }
    for (const [key, until] of this.cooldownUntil.entries()) {
      if (until < nowMs - 60_000) this.cooldownUntil.delete(key);
    }
  }
}

class OpportunityDecisionRecorder {
  private readonly accepted: AcceptedOpportunityRecord[] = [];
  private readonly discarded: DiscardedOpportunityRecord[] = [];

  recordAccepted(candidate: OpportunityCandidate, reasons: readonly string[], nowIso: string): void {
    this.accepted.push({
      type: "accepted",
      candidate,
      reasons: [...reasons],
      recordedAt: nowIso,
    });
    if (this.accepted.length > 500) this.accepted.shift();
  }

  recordDiscard(
    strategy: OpportunityStrategy,
    instrument: OpportunityInstrument,
    reason: OpportunityDiscardReason,
    detail: string,
    evidence: readonly string[],
    nowIso: string,
  ): void {
    this.discarded.push({
      type: "discarded",
      strategy,
      instrument: instrument.symbol,
      conId: instrument.conId,
      reason,
      detail,
      evidence: [...evidence],
      detectedAt: nowIso,
    });
    if (this.discarded.length > 1200) this.discarded.shift();
  }

  snapshot() {
    return {
      accepted: [...this.accepted].reverse(),
      discarded: [...this.discarded].reverse(),
    };
  }
}

function buildSignals(
  instrument: OpportunityInstrument,
  market: OpportunityMarketSnapshot,
  session: OpportunityCalendarSession,
  news: readonly string[],
  events: readonly string[],
  imbalanceScore: number,
): readonly OpportunitySignal[] {
  const trend = market.trend ?? 0;
  const momentum = market.momentum ?? 0;
  const volatility = market.volatility ?? 0.5;
  const correlation = market.correlation ?? 0;
  const macroScore = market.macroScore ?? 0;
  const volumeRatio =
    market.volume != null && market.averageVolume != null && market.averageVolume > 0
      ? market.volume / market.averageVolume
      : 1;
  const gap =
    market.previousClose != null && Number.isFinite(market.previousClose) && market.previousClose > 0
      ? (market.last - market.previousClose) / market.previousClose
      : 0;

  const evidenceBase = [
    `session=${session.phase}`,
    `symbol=${instrument.symbol}`,
    `asset=${instrument.assetClass}`,
  ];

  return [
    {
      strategy: "trend-scanner",
      direction: trend >= 0 ? "long" : "short",
      confidence: Math.min(1, Math.max(0, Math.abs(trend))),
      evidence: [...evidenceBase, `trend=${trend.toFixed(3)}`],
    },
    {
      strategy: "mean-reversion",
      direction: Math.abs(gap) > 0.008 ? (gap > 0 ? "short" : "long") : "neutral",
      confidence: Math.min(1, Math.abs(gap) * 20),
      evidence: [...evidenceBase, `gap=${(gap * 100).toFixed(2)}%`],
    },
    {
      strategy: "breakout",
      direction: Math.abs(momentum) > 0.6 ? (momentum > 0 ? "long" : "short") : "neutral",
      confidence: Math.min(1, Math.abs(momentum)),
      evidence: [...evidenceBase, `momentum=${momentum.toFixed(3)}`],
    },
    {
      strategy: "momentum",
      direction: momentum >= 0 ? "long" : "short",
      confidence: Math.min(1, Math.max(0, Math.abs(momentum))),
      evidence: [...evidenceBase, `momentum=${momentum.toFixed(3)}`],
    },
    {
      strategy: "volatility",
      direction: volatility > 0.7 ? "neutral" : momentum >= 0 ? "long" : "short",
      confidence: Math.min(1, Math.max(0, volatility)),
      evidence: [...evidenceBase, `volatility=${volatility.toFixed(3)}`],
    },
    {
      strategy: "anomalous-volume",
      direction: volumeRatio >= 1 ? "long" : "neutral",
      confidence: Math.min(1, Math.max(0, (volumeRatio - 1) / 2)),
      evidence: [...evidenceBase, `volume_ratio=${volumeRatio.toFixed(2)}`],
    },
    {
      strategy: "gaps",
      direction: gap >= 0 ? "long" : "short",
      confidence: Math.min(1, Math.abs(gap) * 20),
      evidence: [...evidenceBase, `gap=${(gap * 100).toFixed(2)}%`],
    },
    {
      strategy: "corporate-events",
      direction: events.length > 0 ? "neutral" : "neutral",
      confidence: Math.min(1, events.length > 0 ? 0.7 : 0.1),
      evidence: [...evidenceBase, ...events.slice(0, 3)],
    },
    {
      strategy: "news",
      direction: news.length > 0 ? "neutral" : "neutral",
      confidence: Math.min(1, news.length > 0 ? 0.65 : 0.1),
      evidence: [...evidenceBase, ...news.slice(0, 3)],
    },
    {
      strategy: "correlations",
      direction: correlation >= 0 ? "long" : "short",
      confidence: Math.min(1, Math.abs(correlation)),
      evidence: [...evidenceBase, `correlation=${correlation.toFixed(3)}`],
    },
    {
      strategy: "statistical-arbitrage",
      direction: Math.abs(correlation) < 0.25 ? "long" : "neutral",
      confidence: Math.min(1, Math.max(0, 0.5 - Math.abs(correlation))),
      evidence: [...evidenceBase, `pair_divergence=${(1 - Math.abs(correlation)).toFixed(3)}`],
    },
    {
      strategy: "macro-changes",
      direction: macroScore >= 0 ? "long" : "short",
      confidence: Math.min(1, Math.abs(macroScore)),
      evidence: [...evidenceBase, `macro_score=${macroScore.toFixed(3)}`],
    },
    {
      strategy: "portfolio-imbalance",
      direction: imbalanceScore >= 0.5 ? "short" : "long",
      confidence: Math.min(1, Math.max(0, imbalanceScore)),
      evidence: [...evidenceBase, `imbalance=${imbalanceScore.toFixed(3)}`],
    },
  ];
}

function makeCandidate(
  instrument: OpportunityInstrument,
  market: OpportunityMarketSnapshot,
  session: OpportunityCalendarSession,
  signal: OpportunitySignal,
  nowIso: string,
  policy: OpportunityScannerPolicy,
  dataFreshness: FreshnessState,
): OpportunityCandidate {
  const bid = market.bid ?? market.last;
  const ask = market.ask ?? market.last;
  const spread = Math.max(0, ask - bid);
  const center = (ask + bid) / 2;
  const priceUnit = center > 0 ? center : market.last;
  const move = Math.max(0.001, Math.abs(signal.confidence) * 0.02) * priceUnit;
  const directionMultiplier = signal.direction === "short" ? -1 : 1;
  const initialStop = priceUnit - directionMultiplier * move;
  const initialTarget = priceUnit + directionMultiplier * move * 1.5;
  const invalidation = priceUnit - directionMultiplier * move * 0.8;
  const nowMs = Date.parse(nowIso);
  const expiresAt = new Date(nowMs + policy.cooldownMsByStrategy[signal.strategy]).toISOString();

  return ensureOpportunityCandidate({
    id: `${instrument.conId}-${signal.strategy}-${nowMs}`,
    instrument: instrument.symbol,
    conId: instrument.conId,
    market: instrument.market,
    currency: instrument.currency,
    strategy: signal.strategy,
    direction: signal.direction,
    timeframe: policy.defaultTimeframe,
    detectedAt: nowIso,
    marketSession: session.phase,
    entryZone: {
      from: Number((priceUnit * 0.998).toFixed(6)),
      to: Number((priceUnit * 1.002).toFixed(6)),
    },
    invalidationLevel: Number(invalidation.toFixed(6)),
    initialStop: Number(initialStop.toFixed(6)),
    initialTarget: Number(initialTarget.toFixed(6)),
    estimatedSpread: Number(spread.toFixed(6)),
    estimatedSlippage: Number((spread * 0.35).toFixed(6)),
    liquidityScore: Number((1 - Math.min(1, spread / Math.max(0.000001, priceUnit))).toFixed(6)),
    confidence: Number(signal.confidence.toFixed(6)),
    evidence: [...signal.evidence],
    dataFreshness,
    expiresAt,
  });
}

export class ContinuousOpportunityScanner {
  private readonly policy: OpportunityScannerPolicy;
  private readonly now: () => Date;
  private readonly intervalMs: number;
  private readonly dedupeCooldown: DedupeCooldownManager;
  private readonly recorder = new OpportunityDecisionRecorder();
  private timer: ReturnType<typeof setInterval> | null = null;
  private startedAt: string | null = null;
  private scanCount = 0;
  private lastScanAt: string | null = null;

  constructor(private readonly deps: OpportunityScannerDeps) {
    this.policy = mergePolicy(deps.policy);
    this.now = deps.now ?? (() => new Date());
    this.intervalMs = Math.max(2_000, deps.pollIntervalMs ?? 10_000);
    this.dedupeCooldown = new DedupeCooldownManager(this.policy);
  }

  start(): void {
    if (this.timer) return;
    this.startedAt = this.now().toISOString();
    this.timer = setInterval(() => {
      this.scanOnce().catch(() => {
        // Keep loop alive; errors are reflected in discarded records when possible.
      });
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  }

  isRunning(): boolean {
    return this.timer != null;
  }

  async scanNow(): Promise<void> {
    await this.scanOnce();
  }

  getSnapshot(): OpportunityScanSnapshot {
    const records = this.recorder.snapshot();
    return {
      scannerStartedAt: this.startedAt,
      scannerRunning: this.isRunning(),
      accepted: records.accepted,
      discarded: records.discarded,
      scanCount: this.scanCount,
      lastScanAt: this.lastScanAt,
    };
  }

  private freshness(capturedAt: string, nowMs: number): FreshnessState {
    const capturedMs = Date.parse(capturedAt);
    if (!Number.isFinite(capturedMs)) return "unknown";
    const age = nowMs - capturedMs;
    if (age < 0) return "fresh";
    if (age <= this.policy.maxDataAgeMs * 0.6) return "fresh";
    if (age <= this.policy.maxDataAgeMs) return "aging";
    return "stale";
  }

  private async scanOnce(): Promise<void> {
    const now = this.now();
    const nowIso = now.toISOString();
    const nowMs = now.getTime();
    this.scanCount += 1;
    this.lastScanAt = nowIso;

    const universe = await this.deps.instruments.listAuthorizedInstruments();
    for (const instrument of universe) {
      if (instrument.assetClass === "crypto" && !instrument.cryptoAllowed) {
        this.recorder.recordDiscard(
          "macro-changes",
          instrument,
          "unauthorized-asset",
          "Crypto instrument not authorized for this broker/region/account.",
          [],
          nowIso,
        );
        continue;
      }

      const [market, session, news, events, imbalanceScore] = await Promise.all([
        this.deps.marketData.getSnapshot(instrument),
        this.deps.calendar.getSession(instrument, nowIso),
        this.deps.news?.getHeadlines(instrument) ?? Promise.resolve([] as readonly string[]),
        this.deps.events?.getCorporateEvents(instrument) ?? Promise.resolve([] as readonly string[]),
        this.deps.portfolio?.getImbalanceScore(instrument) ?? Promise.resolve(0.25),
      ]);

      if (!market) {
        this.recorder.recordDiscard(
          "trend-scanner",
          instrument,
          "market-data-unavailable",
          "Market snapshot unavailable.",
          [],
          nowIso,
        );
        continue;
      }
      if (!session) {
        this.recorder.recordDiscard(
          "trend-scanner",
          instrument,
          "session-unavailable",
          "Session calendar data unavailable.",
          [`market=${instrument.market}`],
          nowIso,
        );
        continue;
      }

      const freshness = this.freshness(market.capturedAt, nowMs);
      if (freshness === "stale" || freshness === "unknown") {
        this.recorder.recordDiscard(
          "trend-scanner",
          instrument,
          "stale-data",
          `Market data freshness=${freshness}.`,
          [`capturedAt=${market.capturedAt}`, `maxAgeMs=${this.policy.maxDataAgeMs}`],
          nowIso,
        );
        continue;
      }

      if (!Number.isFinite(market.bid) || !Number.isFinite(market.ask)) {
        this.recorder.recordDiscard(
          "trend-scanner",
          instrument,
          "missing-bid-ask",
          "Bid/ask quotes required.",
          [],
          nowIso,
        );
        continue;
      }

      const spread = market.ask! - market.bid!;
      if (spread > this.policy.maxSpreadByAssetClass[instrument.assetClass]) {
        this.recorder.recordDiscard(
          "trend-scanner",
          instrument,
          "spread-too-wide",
          `Spread ${spread.toFixed(6)} exceeds limit ${this.policy.maxSpreadByAssetClass[instrument.assetClass].toFixed(6)}.`,
          [],
          nowIso,
        );
        continue;
      }

      const signals = buildSignals(instrument, market, session, news, events, imbalanceScore);
      for (const signal of signals) {
        if (signal.confidence < this.policy.minConfidence) {
          this.recorder.recordDiscard(
            signal.strategy,
            instrument,
            "signal-not-strong-enough",
            `Confidence ${signal.confidence.toFixed(3)} below minimum ${this.policy.minConfidence.toFixed(3)}.`,
            signal.evidence,
            nowIso,
          );
          continue;
        }

        const dedupeKey = this.dedupeCooldown.dedupeKey(instrument, signal);
        const cooldownKey = this.dedupeCooldown.cooldownKey(instrument, signal);
        if (this.dedupeCooldown.checkDuplicate(dedupeKey, nowMs)) {
          this.recorder.recordDiscard(
            signal.strategy,
            instrument,
            "duplicate-signal",
            `Duplicate signal key ${dedupeKey}.`,
            signal.evidence,
            nowIso,
          );
          continue;
        }
        if (this.dedupeCooldown.checkCooldown(cooldownKey, nowMs)) {
          this.recorder.recordDiscard(
            signal.strategy,
            instrument,
            "cooldown-active",
            `Cooldown active for key ${cooldownKey}.`,
            signal.evidence,
            nowIso,
          );
          continue;
        }

        const candidate = makeCandidate(
          instrument,
          market,
          session,
          signal,
          nowIso,
          this.policy,
          freshness,
        );
        this.recorder.recordAccepted(candidate, ["passed all acceptance rules"], nowIso);
        this.dedupeCooldown.markAccepted(instrument, signal, nowMs);
      }
    }
  }
}
