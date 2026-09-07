/**
 * Continuous analysis loop — scanner + ensemble + brain/committee + risk.
 * Produces explainable prioritized opportunities. NO_TRADE when data not LIVE.
 * Never submits orders.
 */

import { buildDemoEnsembleVotes, evaluateEnsembleConsensus, type EnsembleInput } from "./ensemble";
import { validateEntry, type EntryContext } from "./guards";
import { loadAutonomousLiveLimits } from "./limits";
import { liveQuoteFromIbkr } from "./data-adapters";
import type { EnsembleConsensusResult, StrategyVote } from "./domain";

export interface AnalysisUniverseSymbol {
  readonly symbol: string;
  readonly bid: number;
  readonly ask: number;
  readonly last: number;
  readonly volume: number;
  readonly quoteAt: string;
  readonly liveOrDelayed: "live" | "delayed" | "unknown";
}

export interface PrioritizedOpportunity {
  readonly id: string;
  readonly symbol: string;
  readonly side: "BUY" | "SELL";
  readonly priority: number;
  readonly score: number;
  readonly decision: "TRADE" | "NO_TRADE";
  readonly confidence: number;
  readonly consensusRatio: number;
  readonly reasoning: readonly string[];
  readonly dissent: string;
  readonly riskDecision: string;
  readonly entry: number;
  readonly stop: number;
  readonly target: number;
  readonly notional: number;
  readonly dataLiveOrDelayed: "live" | "delayed" | "unknown";
  readonly ensemble: EnsembleConsensusResult;
}

export interface ContinuousAnalysisResult {
  readonly generatedAt: string;
  readonly symbolsScanned: number;
  readonly opportunities: readonly PrioritizedOpportunity[];
  readonly noTradeCount: number;
  readonly liveDataRequired: true;
  readonly orderSubmitted: false;
}

function mid(bid: number, ask: number, last: number): number {
  if (bid > 0 && ask > 0) return (bid + ask) / 2;
  return last > 0 ? last : 0;
}

function analyzeSymbol(
  item: AnalysisUniverseSymbol,
  nowIso: string,
  votesFactory: (symbol: string) => StrategyVote[],
): PrioritizedOpportunity {
  const limits = loadAutonomousLiveLimits();
  const quote = liveQuoteFromIbkr({
    bid: item.bid,
    ask: item.ask,
    last: item.last,
    volume: item.volume,
    timestamp: item.quoteAt,
    nowIso,
  });
  // Preserve delayed/unknown — never confuse with live
  const effectiveQuote = {
    ...quote,
    meta: { ...quote.meta, liveOrDelayed: item.liveOrDelayed },
  };

  const votes = votesFactory(item.symbol);
  const ensembleInput: EnsembleInput = {
    votes,
    minConsensus: limits.minConsensus,
    minConfidence: limits.minConfidence,
    liquidityOk: item.volume >= limits.minVolume,
    spreadOk: item.bid > 0 && item.ask > 0,
    riskApproved: true,
    regime: "unknown",
  };
  const ensemble = evaluateEnsembleConsensus(ensembleInput);

  const px = mid(item.bid, item.ask, item.last);
  const stop = px * 0.98;
  const target = px * 1.03;
  const notional = Math.min(limits.maxOrderNotionalEur, px > 0 ? px : limits.maxOrderNotionalEur);
  const rewardRisk = px > 0 ? (target - px) / Math.max(0.0001, px - stop) : 0;

  const entryCtx: EntryContext = {
    quote: effectiveQuote,
    limits,
    contractUnambiguous: true,
    marketOpen: true,
    correctAccount: true,
    sufficientFunds: true,
    duplicateOrder: false,
    incompatiblePosition: false,
    riskApproved: ensemble.approved,
    stopDefined: true,
    targetDefined: true,
    rewardRisk,
    costsAndSlippageIncluded: true,
    circuitBreakerActive: false,
    orderType: "LIMIT",
    instrument: "EQUITY",
    side: "BUY",
    outsideRth: false,
    notionalEur: notional,
    dailyNewExposureEur: notional,
    openPositions: 0,
    tradesToday: 0,
    riskPerTradePct: 0.05,
  };
  const failures = validateEntry(entryCtx);
  const liveFail = item.liveOrDelayed !== "live";
  const decision =
    liveFail || failures.length > 0 || !ensemble.approved ? "NO_TRADE" : "TRADE";

  const reasoning: string[] = [
    `Data: ${item.liveOrDelayed} (LIVE required for TRADE)`,
    ensemble.reason,
    ...failures.map((f) => f.message),
  ];
  if (liveFail) {
    reasoning.unshift("NO_TRADE: market data is not LIVE");
  }

  const score =
    decision === "TRADE"
      ? ensemble.consensusRatio * 40 + ensemble.averageConfidence * 40 + Math.min(20, rewardRisk * 5)
      : 0;

  return {
    id: `opp-${item.symbol}-${nowIso}`,
    symbol: item.symbol,
    side: ensemble.side === "SELL" ? "SELL" : "BUY",
    priority: 0,
    score,
    decision,
    confidence: ensemble.averageConfidence,
    consensusRatio: ensemble.consensusRatio,
    reasoning,
    dissent: ensemble.minorityReport,
    riskDecision: failures.length ? failures.map((f) => f.code).join(",") : "APPROVED",
    entry: Number(px.toFixed(4)),
    stop: Number(stop.toFixed(4)),
    target: Number(target.toFixed(4)),
    notional: Number(notional.toFixed(2)),
    dataLiveOrDelayed: item.liveOrDelayed,
    ensemble,
  };
}

/**
 * Run one analysis pass over a universe. Sort TRADE opportunities by score desc.
 */
export function runContinuousAnalysis(args: {
  readonly universe: readonly AnalysisUniverseSymbol[];
  readonly nowIso?: string;
  readonly votesFactory?: (symbol: string) => StrategyVote[];
}): ContinuousAnalysisResult {
  const nowIso = args.nowIso ?? new Date().toISOString();
  const votesFactory = args.votesFactory ?? buildDemoEnsembleVotes;
  const analyzed = args.universe.map((item) => analyzeSymbol(item, nowIso, votesFactory));

  const tradeable = analyzed
    .filter((o) => o.decision === "TRADE")
    .sort((a, b) => b.score - a.score)
    .map((o, index) => ({ ...o, priority: index + 1 }));

  const blocked = analyzed
    .filter((o) => o.decision === "NO_TRADE")
    .map((o, index) => ({ ...o, priority: 1000 + index }));

  return {
    generatedAt: nowIso,
    symbolsScanned: args.universe.length,
    opportunities: [...tradeable, ...blocked],
    noTradeCount: blocked.length,
    liveDataRequired: true,
    orderSubmitted: false,
  };
}
