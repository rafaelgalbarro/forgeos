import type { OpportunityMarketSnapshot, DetectionSignal, OpportunityScanContext } from "./ports";
import type { OpportunityDirection, OpportunityEvidenceItem } from "../domain";

function clamp01(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

function score100(confidence: number, magnitude: number): number {
  return Number((clamp01(confidence) * 55 + clamp01(magnitude) * 45).toFixed(2));
}

function evidence(code: string, detail: string, weight: number): OpportunityEvidenceItem {
  return { code, detail, weight: clamp01(weight) };
}

function directionFromSigned(value: number, threshold = 0): OpportunityDirection {
  if (value > threshold) return "long";
  if (value < -threshold) return "short";
  return "neutral";
}

function lastBars(snapshot: OpportunityMarketSnapshot, count: number) {
  return snapshot.bars.slice(-count);
}

function pctChange(from: number, to: number): number {
  if (!Number.isFinite(from) || from === 0) return 0;
  return (to - from) / from;
}

function atrPct(snapshot: OpportunityMarketSnapshot): number {
  if (snapshot.atr != null && snapshot.last > 0) return snapshot.atr / snapshot.last;
  const bars = lastBars(snapshot, 14);
  if (bars.length < 2) return 0.01;
  let sum = 0;
  for (let i = 1; i < bars.length; i += 1) {
    const prev = bars[i - 1]!;
    const bar = bars[i]!;
    const tr = Math.max(bar.high - bar.low, Math.abs(bar.high - prev.close), Math.abs(bar.low - prev.close));
    sum += tr;
  }
  return sum / (bars.length - 1) / snapshot.last;
}

function zones(
  last: number,
  direction: OpportunityDirection,
  stopPct: number,
  targetPct: number,
): Pick<DetectionSignal, "entryFrom" | "entryTo" | "stop" | "target"> {
  const band = last * 0.002;
  const sign = direction === "short" ? -1 : 1;
  return {
    entryFrom: Number((last - band).toFixed(6)),
    entryTo: Number((last + band).toFixed(6)),
    stop: Number((last - sign * last * stopPct).toFixed(6)),
    target: Number((last + sign * last * targetPct).toFixed(6)),
  };
}

export function detectBreakouts(snapshot: OpportunityMarketSnapshot): DetectionSignal | null {
  const bars = lastBars(snapshot, 20);
  if (bars.length < 10) return null;
  const lookback = bars.slice(0, -1);
  const high = Math.max(...lookback.map((b) => b.high));
  const low = Math.min(...lookback.map((b) => b.low));
  const last = snapshot.last;
  const vol = snapshot.averageVolume && snapshot.averageVolume > 0
    ? (bars.at(-1)?.volume ?? 0) / snapshot.averageVolume
    : 1;
  let direction: OpportunityDirection = "neutral";
  let magnitude = 0;
  if (last > high) {
    direction = "long";
    magnitude = pctChange(high, last);
  } else if (last < low) {
    direction = "short";
    magnitude = pctChange(low, last);
  }
  if (direction === "neutral" || Math.abs(magnitude) < 0.001) return null;
  const confidence = clamp01(0.45 + Math.abs(magnitude) * 40 + (vol > 1.2 ? 0.15 : 0));
  const atr = atrPct(snapshot);
  return {
    detection: "breakout",
    direction,
    score: score100(confidence, Math.abs(magnitude) * 50),
    confidence,
    evidence: [
      evidence("breakout_level", `price ${last.toFixed(4)} vs range ${low.toFixed(4)}-${high.toFixed(4)}`, 0.8),
      evidence("volume_confirm", `volume ratio ${vol.toFixed(2)}`, clamp01(vol / 2)),
    ],
    riskFactors: ["false_breakout", "spread_widening"],
    maxAdverseMovePct: Number((atr * 100 * 1.2).toFixed(3)),
    eventRisk: 0.25,
    ...zones(last, direction, atr * 1.2, atr * 2.2),
    expiryMs: 4 * 60 * 60 * 1000,
    timeframe: "1h",
  };
}

export function detectMomentum(snapshot: OpportunityMarketSnapshot): DetectionSignal | null {
  const bars = lastBars(snapshot, 12);
  if (bars.length < 5) return null;
  const first = bars[0]!.close;
  const last = snapshot.last;
  const change = pctChange(first, last);
  if (Math.abs(change) < 0.008) return null;
  const direction = directionFromSigned(change);
  const confidence = clamp01(Math.abs(change) * 25);
  const atr = atrPct(snapshot);
  return {
    detection: "momentum",
    direction,
    score: score100(confidence, Math.abs(change) * 40),
    confidence,
    evidence: [
      evidence("price_change", `${(change * 100).toFixed(2)}% over ${bars.length} bars`, confidence),
      evidence("close", `last=${last.toFixed(4)}`, 0.5),
    ],
    riskFactors: ["momentum_exhaustion"],
    maxAdverseMovePct: Number((atr * 100).toFixed(3)),
    eventRisk: 0.2,
    ...zones(last, direction, atr, atr * 1.8),
    expiryMs: 3 * 60 * 60 * 1000,
    timeframe: "15m",
  };
}

export function detectReversals(snapshot: OpportunityMarketSnapshot): DetectionSignal | null {
  const bars = lastBars(snapshot, 8);
  if (bars.length < 5) return null;
  const mid = bars[Math.floor(bars.length / 2)]!.close;
  const first = bars[0]!.close;
  const last = snapshot.last;
  const leg1 = pctChange(first, mid);
  const leg2 = pctChange(mid, last);
  // Reversal: prior move then opposite snap-back
  if (Math.sign(leg1) === Math.sign(leg2) || Math.abs(leg1) < 0.01 || Math.abs(leg2) < 0.006) return null;
  const direction = directionFromSigned(leg2);
  const confidence = clamp01(Math.abs(leg2) * 30);
  const atr = atrPct(snapshot);
  return {
    detection: "reversal",
    direction,
    score: score100(confidence, Math.abs(leg2) * 45),
    confidence,
    evidence: [
      evidence("prior_leg", `${(leg1 * 100).toFixed(2)}%`, clamp01(Math.abs(leg1) * 20)),
      evidence("snapback", `${(leg2 * 100).toFixed(2)}%`, confidence),
    ],
    riskFactors: ["continuation_trap"],
    maxAdverseMovePct: Number((atr * 100 * 1.4).toFixed(3)),
    eventRisk: 0.3,
    ...zones(last, direction, atr * 1.3, atr * 1.6),
    expiryMs: 2 * 60 * 60 * 1000,
    timeframe: "15m",
  };
}

export function detectVolatility(snapshot: OpportunityMarketSnapshot): DetectionSignal | null {
  const atr = atrPct(snapshot);
  if (atr < 0.015) return null;
  const bars = lastBars(snapshot, 6);
  const change = bars.length >= 2 ? pctChange(bars[0]!.close, snapshot.last) : 0;
  const direction = directionFromSigned(change, 0.002);
  const confidence = clamp01((atr - 0.01) * 20);
  return {
    detection: "volatility",
    direction: direction === "neutral" ? "neutral" : direction,
    score: score100(confidence, atr * 30),
    confidence,
    evidence: [
      evidence("atr_pct", `ATR ${(atr * 100).toFixed(2)}% of last`, confidence),
      evidence("short_move", `${(change * 100).toFixed(2)}%`, clamp01(Math.abs(change) * 25)),
    ],
    riskFactors: ["volatility_spike", "gap_risk"],
    maxAdverseMovePct: Number((atr * 100 * 1.5).toFixed(3)),
    eventRisk: 0.35,
    ...zones(snapshot.last, direction === "neutral" ? "long" : direction, atr * 1.5, atr * 2),
    expiryMs: 90 * 60 * 1000,
    timeframe: "5m",
  };
}

export function detectGaps(snapshot: OpportunityMarketSnapshot): DetectionSignal | null {
  if (snapshot.previousClose == null || snapshot.previousClose <= 0) return null;
  const gap = pctChange(snapshot.previousClose, snapshot.last);
  if (Math.abs(gap) < 0.01) return null;
  const direction = directionFromSigned(gap);
  const confidence = clamp01(Math.abs(gap) * 20);
  const atr = atrPct(snapshot);
  return {
    detection: "gap",
    direction,
    score: score100(confidence, Math.abs(gap) * 40),
    confidence,
    evidence: [
      evidence("gap_pct", `${(gap * 100).toFixed(2)}% from previous close`, confidence),
      evidence("previous_close", String(snapshot.previousClose), 0.4),
    ],
    riskFactors: ["gap_fill", "overnight_risk"],
    maxAdverseMovePct: Number((Math.max(atr, Math.abs(gap)) * 100).toFixed(3)),
    eventRisk: 0.4,
    ...zones(snapshot.last, direction, Math.abs(gap) * 0.8, Math.abs(gap) * 1.2),
    expiryMs: 6 * 60 * 60 * 1000,
    timeframe: "1d",
  };
}

export function detectVolumeChanges(snapshot: OpportunityMarketSnapshot): DetectionSignal | null {
  if (!snapshot.averageVolume || snapshot.averageVolume <= 0) return null;
  const lastBar = snapshot.bars.at(-1);
  if (!lastBar) return null;
  const ratio = lastBar.volume / snapshot.averageVolume;
  if (ratio < 1.8) return null;
  const change = snapshot.previousClose ? pctChange(snapshot.previousClose, snapshot.last) : 0;
  const direction = directionFromSigned(change, 0.001);
  const confidence = clamp01((ratio - 1) / 3);
  const atr = atrPct(snapshot);
  return {
    detection: "volume_change",
    direction,
    score: score100(confidence, ratio / 4),
    confidence,
    evidence: [
      evidence("volume_ratio", `${ratio.toFixed(2)}x average`, confidence),
      evidence("price_bias", `${(change * 100).toFixed(2)}%`, clamp01(Math.abs(change) * 20)),
    ],
    riskFactors: ["liquidity_fade"],
    maxAdverseMovePct: Number((atr * 100).toFixed(3)),
    eventRisk: 0.25,
    ...zones(snapshot.last, direction === "neutral" ? "long" : direction, atr, atr * 1.5),
    expiryMs: 2 * 60 * 60 * 1000,
    timeframe: "15m",
  };
}

export function detectRelativeStrengthWeakness(context: OpportunityScanContext): DetectionSignal[] {
  const signals: DetectionSignal[] = [];
  for (const rel of context.relative ?? []) {
    if (Math.abs(rel.relativeStrength) < 0.01) continue;
    const snapshot =
      context.snapshots.find((s) => s.instrument.symbol === rel.instrumentSymbol) ?? context.snapshots[0];
    if (!snapshot) continue;
    const isStrength = rel.relativeStrength > 0;
    const confidence = clamp01(Math.abs(rel.relativeStrength) * 15);
    const atr = atrPct(snapshot);
    const direction: OpportunityDirection = isStrength ? "long" : "short";
    signals.push({
      detection: isStrength ? "relative_strength" : "relative_weakness",
      direction,
      score: score100(confidence, Math.abs(rel.relativeStrength) * 30),
      confidence,
      evidence: [
        evidence("rs", `RS ${rel.relativeStrength.toFixed(4)} vs ${rel.benchmarkSymbol}`, confidence),
        evidence("returns", `inst ${(rel.instrumentReturn * 100).toFixed(2)}% / bench ${(rel.benchmarkReturn * 100).toFixed(2)}%`, 0.6),
      ],
      riskFactors: ["benchmark_regime_shift"],
      maxAdverseMovePct: Number((atr * 100).toFixed(3)),
      eventRisk: 0.2,
      ...zones(snapshot.last, direction, atr, atr * 1.7),
      expiryMs: 8 * 60 * 60 * 1000,
      timeframe: "1d",
    });
  }
  return signals;
}

export function detectSectorRotation(context: OpportunityScanContext): DetectionSignal[] {
  const signals: DetectionSignal[] = [];
  for (const sector of context.sectors ?? []) {
    if (Math.abs(sector.rotationScore) < 0.015) continue;
    const snapshot = context.snapshots.find((s) => s.instrument.sector === sector.sector) ?? context.snapshots[0];
    if (!snapshot) continue;
    const direction = directionFromSigned(sector.rotationScore);
    const confidence = clamp01(Math.abs(sector.rotationScore) * 12);
    const atr = atrPct(snapshot);
    signals.push({
      detection: "sector_rotation",
      direction,
      score: score100(confidence, Math.abs(sector.rotationScore) * 25),
      confidence,
      evidence: [
        evidence("sector", `${sector.sector} rotation ${sector.rotationScore.toFixed(4)}`, confidence),
        evidence("sector_vs_market", `sector ${(sector.sectorReturn * 100).toFixed(2)}% / mkt ${(sector.marketReturn * 100).toFixed(2)}%`, 0.55),
      ],
      riskFactors: ["rotation_whipsaw"],
      maxAdverseMovePct: Number((atr * 100 * 1.1).toFixed(3)),
      eventRisk: 0.22,
      ...zones(snapshot.last, direction, atr, atr * 1.6),
      expiryMs: 24 * 60 * 60 * 1000,
      timeframe: "1d",
    });
  }
  return signals;
}

export function detectGeographicRotation(context: OpportunityScanContext): DetectionSignal[] {
  const signals: DetectionSignal[] = [];
  for (const geo of context.geography ?? []) {
    if (Math.abs(geo.rotationScore) < 0.015) continue;
    const snapshot = context.snapshots.find((s) => s.instrument.region === geo.region) ?? context.snapshots[0];
    if (!snapshot) continue;
    const direction = directionFromSigned(geo.rotationScore);
    const confidence = clamp01(Math.abs(geo.rotationScore) * 12);
    const atr = atrPct(snapshot);
    signals.push({
      detection: "geographic_rotation",
      direction,
      score: score100(confidence, Math.abs(geo.rotationScore) * 25),
      confidence,
      evidence: [
        evidence("region", `${geo.region} rotation ${geo.rotationScore.toFixed(4)}`, confidence),
        evidence("region_vs_global", `region ${(geo.regionReturn * 100).toFixed(2)}% / global ${(geo.globalReturn * 100).toFixed(2)}%`, 0.55),
      ],
      riskFactors: ["fx_overlay", "policy_shock"],
      maxAdverseMovePct: Number((atr * 100 * 1.2).toFixed(3)),
      eventRisk: 0.28,
      ...zones(snapshot.last, direction, atr * 1.1, atr * 1.7),
      expiryMs: 24 * 60 * 60 * 1000,
      timeframe: "1d",
    });
  }
  return signals;
}

export function detectCorrelations(context: OpportunityScanContext): DetectionSignal[] {
  const signals: DetectionSignal[] = [];
  for (const corr of context.correlations ?? []) {
    const snapshot = context.snapshots[0];
    if (!snapshot) continue;
    const atr = atrPct(snapshot);
    if (Math.abs(corr.correlation) >= 0.85) {
      const confidence = clamp01(Math.abs(corr.correlation));
      signals.push({
        detection: "correlation",
        direction: "neutral",
        score: score100(confidence, Math.abs(corr.correlation)),
        confidence,
        evidence: [
          evidence("corr", `corr ${corr.correlation.toFixed(3)} vs ${corr.pairSymbol} (${corr.lookback})`, confidence),
        ],
        riskFactors: ["contagion"],
        maxAdverseMovePct: Number((atr * 100).toFixed(3)),
        eventRisk: 0.3,
        ...zones(snapshot.last, "long", atr, atr * 1.2),
        expiryMs: 12 * 60 * 60 * 1000,
        timeframe: "1d",
      });
    } else if (Math.abs(corr.correlation) <= 0.2) {
      const confidence = clamp01(1 - Math.abs(corr.correlation));
      signals.push({
        detection: "decorrelation",
        direction: "neutral",
        score: score100(confidence, 1 - Math.abs(corr.correlation)),
        confidence,
        evidence: [
          evidence("decorrelation", `corr ${corr.correlation.toFixed(3)} vs ${corr.pairSymbol}`, confidence),
        ],
        riskFactors: ["pair_breakdown"],
        maxAdverseMovePct: Number((atr * 100 * 1.1).toFixed(3)),
        eventRisk: 0.25,
        ...zones(snapshot.last, "long", atr, atr * 1.3),
        expiryMs: 12 * 60 * 60 * 1000,
        timeframe: "1d",
      });
    }
  }
  return signals;
}

export function detectMacroNewsEarnings(context: OpportunityScanContext): DetectionSignal[] {
  const signals: DetectionSignal[] = [];
  const snapshot = context.snapshots[0];
  if (!snapshot) return signals;
  const atr = atrPct(snapshot);

  for (const event of context.macroEvents ?? []) {
    if (event.severity < 0.5) continue;
    const confidence = clamp01(event.severity);
    signals.push({
      detection: "macro_event",
      direction: "neutral",
      score: score100(confidence, event.severity),
      confidence,
      evidence: [
        evidence("macro", event.title, confidence),
        evidence("scheduled", event.scheduledAt, 0.4),
      ],
      riskFactors: ["event_gap", "liquidity_vacuum"],
      maxAdverseMovePct: Number((atr * 100 * (1 + event.severity)).toFixed(3)),
      eventRisk: clamp01(event.severity),
      ...zones(snapshot.last, "long", atr * 1.5, atr * 1.2),
      expiryMs: Math.max(60_000, Date.parse(event.scheduledAt) - Date.parse(context.nowIso) + 2 * 60 * 60 * 1000),
      timeframe: "event",
    });
  }

  for (const item of context.news ?? []) {
    if (Math.abs(item.sentiment) < 0.4) continue;
    const matched = context.snapshots.find((s) => item.symbols.includes(s.instrument.symbol)) ?? snapshot;
    const direction = directionFromSigned(item.sentiment);
    const confidence = clamp01(Math.abs(item.sentiment));
    const matchedAtr = atrPct(matched);
    signals.push({
      detection: "news",
      direction,
      score: score100(confidence, Math.abs(item.sentiment)),
      confidence,
      evidence: [
        evidence("headline", item.headline, confidence),
        evidence("sentiment", item.sentiment.toFixed(3), confidence),
      ],
      riskFactors: ["headline_reversal"],
      maxAdverseMovePct: Number((matchedAtr * 100 * 1.3).toFixed(3)),
      eventRisk: 0.45,
      ...zones(matched.last, direction, matchedAtr * 1.2, matchedAtr * 1.5),
      expiryMs: 4 * 60 * 60 * 1000,
      timeframe: "news",
    });
  }

  for (const earn of context.earnings ?? []) {
    const matched = context.snapshots.find((s) => s.instrument.symbol === earn.symbol) ?? snapshot;
    const surprise = earn.surprisePct ?? 0;
    const expected = earn.expectedMovePct ?? atrPct(matched) * 100;
    if (Math.abs(surprise) < 1 && expected < 1.5) continue;
    const direction = directionFromSigned(surprise);
    const confidence = clamp01(Math.abs(surprise) / 10 + expected / 20);
    signals.push({
      detection: "earnings",
      direction: direction === "neutral" ? "neutral" : direction,
      score: score100(confidence, Math.abs(surprise) / 8),
      confidence,
      evidence: [
        evidence("earnings_date", earn.reportDate, 0.5),
        evidence("surprise", `${surprise.toFixed(2)}%`, clamp01(Math.abs(surprise) / 10)),
        evidence("expected_move", `${expected.toFixed(2)}%`, clamp01(expected / 15)),
      ],
      riskFactors: ["post_earnings_drift", "guidance_gap"],
      maxAdverseMovePct: Number(Math.max(expected, atrPct(matched) * 100).toFixed(3)),
      eventRisk: 0.55,
      ...zones(matched.last, direction === "neutral" ? "long" : direction, atrPct(matched) * 1.6, atrPct(matched) * 1.8),
      expiryMs: 48 * 60 * 60 * 1000,
      timeframe: "earnings",
    });
  }

  return signals;
}

export function runPriceDetectors(snapshot: OpportunityMarketSnapshot): DetectionSignal[] {
  return [
    detectBreakouts(snapshot),
    detectMomentum(snapshot),
    detectReversals(snapshot),
    detectVolatility(snapshot),
    detectGaps(snapshot),
    detectVolumeChanges(snapshot),
  ].filter((signal): signal is DetectionSignal => signal != null);
}

export function runContextDetectors(context: OpportunityScanContext): DetectionSignal[] {
  return [
    ...detectRelativeStrengthWeakness(context),
    ...detectSectorRotation(context),
    ...detectGeographicRotation(context),
    ...detectCorrelations(context),
    ...detectMacroNewsEarnings(context),
  ];
}
