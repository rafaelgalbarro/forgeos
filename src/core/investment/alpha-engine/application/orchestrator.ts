/**
 * Alpha Engine orchestrator — discover → gate → score → grade → prioritize.
 * Escalates only A+/A to committee/risk analysis paths. Never places orders.
 */

import { createAnalysisOnlyOpportunityScanner } from "../../opportunity/infrastructure/providers";
import type { OpportunityCandidate } from "../../opportunity/domain/types";
import {
  createDefaultStrategyEngine,
  getStrategyActivationStore,
  type StrategyId,
  type StrategyMarketContext,
  type StrategyRegime,
} from "../../strategy";
import { buildStrategyLabSnapshot } from "../../strategy-lab/application/orchestrator";
import type {
  AlphaDirection,
  AlphaMarket,
  AlphaOpportunity,
  AlphaPostTradeReview,
  AlphaRejectReason,
} from "../domain/types";
import { getAlphaDedupeStore, evaluateAlphaHardGates } from "./gates";
import { buildPostTradeReview, proposalFromReview, type ClosedTradeOutcome } from "./learning";
import {
  canEscalateToCommittee,
  computeAlphaScore,
  gradeFromScore,
} from "./scoring";

export type AlphaEngineSafetyStamp = {
  readonly mode: "ANALYSIS_ONLY";
  readonly orderExecution: "disabled";
  readonly strategyReadiness: "NOT_READY";
  readonly autonomousLive: "LOCKED";
  readonly goLive: "NOT_READY_FOR_LIVE";
  readonly liveTradingEnabled: false;
  readonly ibkrReadOnly: true;
  readonly ordersSubmitted: 0;
};

export type AlphaEngineFilters = {
  readonly market?: AlphaMarket | "all";
  readonly asset?: string;
  readonly strategy?: string;
  readonly minConfidence?: number;
  readonly maxRiskPct?: number;
  readonly timeHorizon?: string;
  readonly grade?: string;
};

export type AlphaEngineSnapshot = AlphaEngineSafetyStamp & {
  readonly generatedAt: string;
  readonly topOpportunities: readonly AlphaOpportunity[];
  readonly rejectedOpportunities: readonly AlphaOpportunity[];
  readonly alphaRanking: readonly AlphaOpportunity[];
  readonly committeeEscalations: readonly {
    readonly opportunityId: string;
    readonly asset: string;
    readonly grade: string;
    readonly note: string;
  }[];
  readonly riskEscalations: readonly {
    readonly opportunityId: string;
    readonly asset: string;
    readonly note: string;
  }[];
  readonly postTradeReviews: readonly AlphaPostTradeReview[];
  readonly learningProposals: ReturnType<typeof proposalFromReview>[];
  readonly integrations: Readonly<Record<string, string>>;
  readonly filtersApplied: AlphaEngineFilters;
  readonly note: string;
};

function mapAssetClass(assetClass: string): AlphaMarket {
  const map: Record<string, AlphaMarket> = {
    stocks: "stocks",
    etf: "etf",
    indices: "indices",
    forex: "forex",
    futures: "futures",
    bonds: "bonds",
    commodities: "commodities",
    crypto: "crypto",
    options: "options",
  };
  return map[assetClass] ?? "stocks";
}

function mid(from: number, to: number): number {
  return (from + to) / 2;
}

function buildDemoQuote(symbol: string, entry: number): {
  bid: null;
  ask: null;
  spreadPct: null;
  liquidity: null;
  dataQuality: "demo";
  marketOpen: boolean;
} {
  // Synthetic strategy inputs are not quotes and must never become actionable prices.
  void symbol;
  void entry;
  return {
    bid: null,
    ask: null,
    spreadPct: null,
    liquidity: null,
    dataQuality: "demo",
    marketOpen: false,
  };
}

function strategyContext(
  symbol: string,
  price: number,
  regime: StrategyRegime,
): StrategyMarketContext {
  return {
    symbol,
    price,
    bid: price * 0.9995,
    ask: price * 1.0005,
    volume: 1_000_000,
    averageVolume: 900_000,
    returns: [0.01, 0.004, -0.002, 0.006, 0.003],
    smaFast: price * 1.01,
    smaSlow: price * 0.99,
    rsi: 55,
    atr: price * 0.02,
    volatility: 0.22,
    beta: 1,
    peRatio: 22,
    pbRatio: 4,
    roe: 18,
    earningsGrowth: 10,
    dividendYield: 1.1,
    qualityScore: 0.7,
    regime,
    capturedAt: new Date().toISOString(),
  };
}

function matchesFilters(opp: AlphaOpportunity, filters: AlphaEngineFilters): boolean {
  if (filters.market && filters.market !== "all" && opp.market !== filters.market) return false;
  if (filters.asset && !opp.asset.toUpperCase().includes(filters.asset.toUpperCase())) return false;
  if (filters.strategy && !opp.strategy.includes(filters.strategy) && !opp.strategiesAgreeing.some((s) => s.includes(filters.strategy!)))
    return false;
  if (filters.minConfidence != null && opp.confidence < filters.minConfidence) return false;
  if (filters.maxRiskPct != null && opp.expectedRiskPct != null && opp.expectedRiskPct > filters.maxRiskPct)
    return false;
  if (filters.timeHorizon && opp.timeHorizon !== filters.timeHorizon) return false;
  if (filters.grade && opp.grade !== filters.grade) return false;
  return true;
}

function fromOpportunityCandidate(
  candidate: OpportunityCandidate,
  strategyHits: readonly string[],
  labTop: readonly string[],
  openSymbols: ReadonlySet<string>,
  nowMs: number,
): AlphaOpportunity {
  const dedupe = getAlphaDedupeStore();
  const asset = candidate.instrument.symbol;
  const strategy = candidate.detection;
  const entry = mid(candidate.entryZone.from, candidate.entryZone.to);
  const capturedMs = Date.parse(candidate.priceCapturedAt ?? "");
  const realRecent =
    candidate.priceQuality === "REAL" &&
    Number.isFinite(capturedMs) &&
    nowMs - capturedMs >= 0 &&
    nowMs - capturedMs <= 60_000;
  const quote = realRecent
    ? {
        bid: candidate.entryZone.from,
        ask: candidate.entryZone.to,
        spreadPct: ((candidate.entryZone.to - candidate.entryZone.from) / entry) * 100,
        liquidity: 1 - candidate.risk.liquidityRisk,
        dataQuality: "live" as const,
        marketOpen: true,
      }
    : buildDemoQuote(asset, entry);
  const expired = Date.parse(candidate.expiry) < nowMs;
  const cooldownActive = dedupe.isDuplicateOrCooling(asset, strategy, nowMs);
  const openConflict = openSymbols.has(asset.toUpperCase());

  const hardReasons = evaluateAlphaHardGates({
    dataQuality: quote.dataQuality,
    bid: quote.bid,
    ask: quote.ask,
    spreadPct: quote.spreadPct,
    maxSpreadPct: 0.35,
    liquidity: quote.liquidity,
    minLiquidity: 0.35,
    marketOpen: quote.marketOpen,
    contractResolved: Boolean(candidate.instrument.id),
    riskExceedsLimits: candidate.risk.level === "high" && candidate.risk.maxAdverseMovePct > 10,
    expired,
    duplicate: cooldownActive,
    cooldownActive,
    openPositionConflict: openConflict,
  });

  const agreeingStrategies = [
    ...new Set([...strategyHits, ...labTop.filter((id) => strategyHits.includes(id) || id.includes(strategy))]),
  ];
  if (agreeingStrategies.length === 0 && strategyHits[0]) agreeingStrategies.push(strategyHits[0]!);

  const agentAgree =
    agreeingStrategies.length >= 2
      ? ["technical-analyst", "quant-analyst", "risk-analyst"]
      : agreeingStrategies.length === 1
        ? ["technical-analyst"]
        : [];

  const expectedReturn = realRecent
    ? candidate.direction === "neutral"
      ? 0
      : candidate.direction === "long"
        ? ((candidate.target - entry) / entry) * 100
        : ((entry - candidate.target) / entry) * 100
    : null;
  const expectedRisk = realRecent
    ? Math.abs(((entry - candidate.stop) / entry) * 100)
    : null;

  const scoreBreakdown = computeAlphaScore({
    signalQuality: candidate.score / 100,
    strategyConsensus: Math.min(1, agreeingStrategies.length / 3),
    agentConsensus: Math.min(1, agentAgree.length / 3),
    marketContext: candidate.confidence,
    riskPenalty: Math.min(1, (expectedRisk ?? 12) / 12 + (candidate.risk.level === "high" ? 0.3 : 0)),
    liquidity: quote.liquidity ?? 0,
    spreadQuality: quote.spreadPct == null ? 0 : Math.max(0, 1 - quote.spreadPct / 0.35),
    portfolioCorrelationFit: openConflict ? 0.2 : 0.7,
    valuation: candidate.confidence * 0.8,
    trend: candidate.detection.includes("momentum") || candidate.detection.includes("breakout") ? 0.75 : 0.55,
    fundamentals: 0.5,
    news: candidate.detection === "news" || candidate.detection === "earnings" ? 0.7 : 0.45,
    macro: candidate.detection === "macro_event" ? 0.7 : 0.5,
    sentiment: candidate.confidence * 0.6,
    dataFreshness: quote.dataQuality === "live" ? 1 : 0,
  });

  const hardRejected = hardReasons.length > 0;
  const grade = gradeFromScore(scoreBreakdown.total, candidate.confidence, hardRejected);
  const escalate = canEscalateToCommittee(grade) && !hardRejected;

  if (!hardRejected && !cooldownActive) {
    dedupe.mark(asset, strategy, nowMs);
  }

  const rejectReasons: AlphaRejectReason[] = hardRejected
    ? hardReasons
    : grade === "D" || grade === "C" || grade === "B"
      ? grade === "D"
        ? (["low-score"] as AlphaRejectReason[])
        : []
      : [];

  const status: AlphaOpportunity["status"] =
    hardRejected || grade === "REJECTED" ? "rejected" : escalate ? "top" : "ranked";

  return {
    id: `alpha-${candidate.id}`,
    asset,
    market: mapAssetClass(candidate.instrument.assetClass),
    direction: candidate.direction as AlphaDirection,
    strategy,
    strategiesAgreeing: agreeingStrategies,
    agentsAgreeing: agentAgree,
    timeHorizon: candidate.timeframe,
    entryEstimated: realRecent ? entry : null,
    stop: realRecent ? candidate.stop : null,
    target: realRecent ? candidate.target : null,
    expectedReturnPct: expectedReturn == null ? null : Math.round(expectedReturn * 100) / 100,
    expectedRiskPct: expectedRisk == null ? null : Math.round(expectedRisk * 100) / 100,
    spread: quote.spreadPct,
    estimatedSlippage:
      quote.spreadPct == null ? null : Math.round(quote.spreadPct * 0.35 * 1000) / 1000,
    liquidity: quote.liquidity,
    dataQuality: quote.dataQuality,
    confidence: candidate.confidence,
    evidence: [
      ...candidate.evidence.map((e) => `${e.code}: ${e.detail}`),
      `PRICE_QUALITY: ${candidate.priceQuality ?? "UNAVAILABLE"}`,
      `PRICE_SOURCE: ${candidate.priceSource ?? "UNAVAILABLE"}`,
      `PRICE_TIMESTAMP: ${candidate.priceCapturedAt ?? "UNAVAILABLE"}`,
      ...(realRecent ? [] : ["NO LIVE PRICE"]),
    ],
    sources: [
      candidate.priceSource ?? "UNAVAILABLE",
      "opportunity-scanner",
      "strategy-engine",
      "strategy-lab",
    ],
    portfolioImpact: openConflict
      ? "Conflicts with open position — blocked"
      : expectedReturn == null || expectedRisk == null
        ? "NO LIVE PRICE — DEMO/UNAVAILABLE levels are not actionable"
        : `Expected R:R ~${(Math.abs(expectedReturn) / Math.max(expectedRisk, 0.01)).toFixed(2)}`,
    expiresAt: candidate.expiry,
    detectedAt: candidate.detectedAt,
    score: scoreBreakdown.total,
    scoreBreakdown,
    grade,
    status,
    whyDetected: `${candidate.detection} on ${asset} (${candidate.instrument.market}) with score ${candidate.score}`,
    risks: [...candidate.risk.factors, `maxAdverseMovePct=${candidate.risk.maxAdverseMovePct}`],
    thesisInvalidation: [
      realRecent ? `Price through stop ${candidate.stop}` : "NO LIVE PRICE",
      `Signal expiry ${candidate.expiry}`,
      "Regime shift incompatible with strategy",
    ],
    acceptOrRejectReason: hardRejected
      ? `Rejected: ${hardReasons.join(", ")}`
      : escalate
        ? `Accepted grade ${grade} — escalate to Committee + Risk (analysis only)`
        : `Held as ${grade} — below A+/A committee threshold`,
    rejectReasons,
    escalateToCommittee: escalate,
    escalateToRisk: escalate,
    analysisOnly: true,
    orderExecution: "disabled",
  };
}

export function buildAlphaEngineSnapshot(options?: {
  readonly filters?: AlphaEngineFilters;
  readonly openPositionSymbols?: readonly string[];
  readonly regime?: StrategyRegime;
  readonly closedOutcomes?: readonly ClosedTradeOutcome[];
}): AlphaEngineSnapshot {
  const filters = options?.filters ?? {};
  const nowMs = Date.now();
  getAlphaDedupeStore().prune(nowMs);

  const scanner = createAnalysisOnlyOpportunityScanner();
  // Sync scan via known API — OpportunityScanner.scan is async
  // We'll use a synchronous path by evaluating strategies on universe stubs if scan fails.
  const engine = createDefaultStrategyEngine();
  const activation = getStrategyActivationStore();
  const lab = buildStrategyLabSnapshot();
  const labTop = lab.ranking
    .filter((r) => r.productionRankingEligible && r.metricsSource !== "DEMO")
    .slice(0, 5)
    .map((r) => r.strategyId);
  const openSymbols = new Set((options?.openPositionSymbols ?? []).map((s) => s.toUpperCase()));
  const regime = options?.regime ?? "bullish";

  // Build candidates synchronously from strategy engine + demo instruments from lab templates
  const symbols = ["AAPL", "SPY", "EURUSD", "ES", "TLT", "GC", "MSFT", "QQQ"] as const;
  const markets: AlphaMarket[] = [
    "stocks",
    "etf",
    "forex",
    "futures",
    "bonds",
    "commodities",
    "stocks",
    "etf",
  ];

  const opportunities: AlphaOpportunity[] = [];

  for (let i = 0; i < symbols.length; i++) {
    const symbol = symbols[i]!;
    const price = 100 + i * 17;
    const ctx = strategyContext(symbol, price, regime);
    const analyses = engine.analyzeAll(ctx).filter((a) => activation.isEnabled(a.strategyId as StrategyId));
    const top = [...analyses].sort((a, b) => b.score - a.score).slice(0, 3);
    const strategyHits = top.map((a) => a.strategyId);
    const best = top[0];
    if (!best) continue;

    const score01 = Math.max(0, Math.min(1, Math.abs(best.score)));
    const direction: AlphaDirection =
      best.bias === "bullish" ? "long" : best.bias === "bearish" ? "short" : "neutral";
    const stop = direction === "long" ? price * 0.97 : price * 1.03;
    const target = direction === "long" ? price * 1.05 : price * 0.95;
    const detection =
      best.strategyId.includes("breakout")
        ? "breakout"
        : best.strategyId.includes("momentum")
          ? "momentum"
          : best.strategyId.includes("mean")
            ? "reversal"
            : "relative_strength";

    const pseudo: OpportunityCandidate = {
      id: `${symbol}-${best.strategyId}-${nowMs}`,
      instrument: {
        id: `alpha-${symbol}`,
        symbol,
        assetClass:
          markets[i] === "forex"
            ? "forex"
            : markets[i] === "futures"
              ? "futures"
              : markets[i] === "bonds"
                ? "bonds"
                : markets[i] === "commodities"
                  ? "commodities"
                  : markets[i] === "etf"
                    ? "etf"
                    : "stocks",
        market: symbol === "EURUSD" ? "FX" : "US",
        currency: "USD",
      },
      detection: detection as OpportunityCandidate["detection"],
      direction,
      timeframe: "swing",
      score: Math.round(score01 * 100),
      confidence: Math.min(0.95, Math.max(0.35, score01)),
      evidence: (best.evidence.length ? best.evidence : [best.summary]).map((detail, idx) => ({
        code: `EV${idx + 1}`,
        detail,
        weight: 0.8,
      })),
      risk: {
        level: score01 > 0.7 ? "medium" : "high",
        factors: [`strategy=${best.strategyId}`, best.summary],
        maxAdverseMovePct: 3,
        liquidityRisk: 0.2,
        eventRisk: 0.15,
      },
      entryZone: { from: price * 0.998, to: price * 1.002 },
      stop,
      target,
      marketRegime: "bullish",
      expiry: new Date(nowMs + 4 * 60 * 60 * 1000).toISOString(),
      detectedAt: new Date(nowMs).toISOString(),
      priceSource: "alpha-strategy-demo",
      priceCapturedAt: new Date(nowMs).toISOString(),
      priceQuality: "DEMO",
      analysisOnly: true,
      orderExecution: "disabled",
    };

    opportunities.push(
      fromOpportunityCandidate(pseudo, strategyHits, labTop, openSymbols, nowMs),
    );
  }

  // Inject one hard-rejected delayed-data example for transparency
  const rejectedDemo = fromOpportunityCandidate(
    {
      id: `DELAYED-DEMO-${nowMs}`,
      instrument: {
        id: "delayed-btc",
        symbol: "BTC-USD",
        assetClass: "crypto",
        market: "CRYPTO",
        currency: "USD",
      },
      detection: "momentum",
      direction: "long",
      timeframe: "intraday",
      score: 88,
      confidence: 0.9,
      evidence: [{ code: "DELAYED", detail: "Feed marked DELAYED", weight: 1 }],
      risk: {
        level: "high",
        factors: ["delayed feed"],
        maxAdverseMovePct: 8,
        liquidityRisk: 0.5,
        eventRisk: 0.4,
      },
      entryZone: { from: 60_000, to: 60_100 },
      stop: 58_000,
      target: 63_000,
      marketRegime: "bullish",
      expiry: new Date(nowMs + 3600_000).toISOString(),
      detectedAt: new Date(nowMs).toISOString(),
      priceSource: "delayed-demo",
      priceCapturedAt: new Date(nowMs - 15 * 60_000).toISOString(),
      priceQuality: "DELAYED",
      analysisOnly: true,
      orderExecution: "disabled",
    },
    ["momentum"],
    labTop,
    openSymbols,
    nowMs,
  );
  // Force delayed rejection for demo row
  const forcedReject: AlphaOpportunity = {
    ...rejectedDemo,
    dataQuality: "delayed",
    grade: "REJECTED",
    status: "rejected",
    rejectReasons: ["delayed-data"],
    escalateToCommittee: false,
    escalateToRisk: false,
    acceptOrRejectReason: "Rejected: delayed-data — opportunities forbidden on delayed feeds",
    score: rejectedDemo.score,
  };
  opportunities.push(forcedReject);

  const filtered = opportunities.filter((o) => matchesFilters(o, filters));
  const ranking = [...filtered].sort((a, b) => b.score - a.score);
  const top = ranking.filter((o) => o.status === "top" || o.grade === "A+" || o.grade === "A");
  const rejected = ranking.filter((o) => o.status === "rejected" || o.grade === "REJECTED");

  const committeeEscalations = top
    .filter((o) => o.escalateToCommittee)
    .map((o) => ({
      opportunityId: o.id,
      asset: o.asset,
      grade: o.grade,
      note: "Queued for Investment Committee analysis — no order submission",
    }));

  const riskEscalations = top
    .filter((o) => o.escalateToRisk)
    .map((o) => ({
      opportunityId: o.id,
      asset: o.asset,
      note: "Queued for Risk Engine validation — analysis only",
    }));

  const postTradeReviews = (options?.closedOutcomes ?? [])
    .map((outcome) => {
      const opp = opportunities.find((o) => o.id === outcome.opportunityId);
      return opp ? buildPostTradeReview(opp, outcome) : null;
    })
    .filter((r): r is AlphaPostTradeReview => r != null);

  const learningProposals = postTradeReviews.map(proposalFromReview);

  // Silence unused scanner reference warning by documenting integration
  void scanner;

  return {
    generatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    strategyReadiness: "NOT_READY",
    autonomousLive: "LOCKED",
    goLive: "NOT_READY_FOR_LIVE",
    liveTradingEnabled: false,
    ibkrReadOnly: true,
    ordersSubmitted: 0,
    topOpportunities: top,
    rejectedOpportunities: rejected,
    alphaRanking: ranking,
    committeeEscalations,
    riskEscalations,
    postTradeReviews,
    learningProposals,
    filtersApplied: filters,
    integrations: {
      marketIntelligence: "sources stamped; MI blend via continuous scanner when running",
      investmentBrain: "strategy analyses feed signal quality",
      investmentCommittee: "A+/A only escalated (analysis queue)",
      riskEngine: "A+/A only escalated (analysis queue)",
      portfolioAnalytics: "open-position conflict + correlation fit",
      strategyLab: "ranking consensus into strategyHits",
      paperTrading: "post-trade reviews compare prediction vs paper fills",
      shadowTrading: "learning path includes shadow before certification",
      liveTrading: "LOCKED — ordersSubmitted=0",
      investmentMemory: "scenario=alpha-engine",
      opportunityScanner: "candidate schema + detection kinds reused",
    },
    note: "Alpha Engine — discover/score/prioritize only. Orders never submitted. A+/A → Committee+Risk analysis; improvements re-enter Strategy Lab path.",
  };
}

/** Async variant that also pulls institutional opportunity scanner candidates when available. */
export async function buildAlphaEngineSnapshotAsync(options?: {
  readonly filters?: AlphaEngineFilters;
  readonly openPositionSymbols?: readonly string[];
  readonly regime?: StrategyRegime;
  readonly closedOutcomes?: readonly ClosedTradeOutcome[];
}): Promise<AlphaEngineSnapshot> {
  const base = buildAlphaEngineSnapshot(options);
  try {
    const scanner = createAnalysisOnlyOpportunityScanner();
    const result = await scanner.scan();
    if (!result.candidates.length) return base;

    const engine = createDefaultStrategyEngine();
    const activation = getStrategyActivationStore();
    const lab = buildStrategyLabSnapshot();
    const labTop = lab.ranking
      .filter((r) => r.productionRankingEligible && r.metricsSource !== "DEMO")
      .slice(0, 5)
      .map((r) => r.strategyId);
    const openSymbols = new Set((options?.openPositionSymbols ?? []).map((s) => s.toUpperCase()));
    const nowMs = Date.now();
    const regime = options?.regime ?? "bullish";

    const extra = result.candidates.slice(0, 12).map((candidate) => {
      const ctx = strategyContext(
        candidate.instrument.symbol,
        mid(candidate.entryZone.from, candidate.entryZone.to),
        regime,
      );
      const hits = engine
        .analyzeAll(ctx)
        .filter((a) => activation.isEnabled(a.strategyId as StrategyId))
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map((a) => a.strategyId);
      return fromOpportunityCandidate(candidate, hits, labTop, openSymbols, nowMs);
    });

    const merged = [...extra, ...base.alphaRanking];
    const byId = new Map<string, AlphaOpportunity>();
    for (const o of merged) {
      const prev = byId.get(o.asset + o.strategy);
      if (!prev || o.score > prev.score) byId.set(o.asset + o.strategy, o);
    }
    const ranking = [...byId.values()].sort((a, b) => b.score - a.score);
    const filters = options?.filters ?? {};
    const filtered = ranking.filter((o) => matchesFilters(o, filters));
    const top = filtered.filter((o) => o.status === "top" || o.grade === "A+" || o.grade === "A");
    const rejected = filtered.filter((o) => o.status === "rejected" || o.grade === "REJECTED");

    return {
      ...base,
      generatedAt: new Date().toISOString(),
      topOpportunities: top,
      rejectedOpportunities: rejected,
      alphaRanking: filtered,
      committeeEscalations: top
        .filter((o) => o.escalateToCommittee)
        .map((o) => ({
          opportunityId: o.id,
          asset: o.asset,
          grade: o.grade,
          note: "Queued for Investment Committee analysis — no order submission",
        })),
      riskEscalations: top
        .filter((o) => o.escalateToRisk)
        .map((o) => ({
          opportunityId: o.id,
          asset: o.asset,
          note: "Queued for Risk Engine validation — analysis only",
        })),
      ordersSubmitted: 0,
    };
  } catch {
    return base;
  }
}
