import { RuleBasedInvestmentStrategy } from "../../application/rule-based-strategy";
import { clampScore, mean } from "../../domain";
import { buildMetadata } from "./metadata";
import type { StrategyId } from "../../domain";

type ExtendedStrategyFactory = () => RuleBasedInvestmentStrategy;

function simpleScoreFactory(config: {
  id: StrategyId;
  name: string;
  assumptions: readonly string[];
  limitations: readonly string[];
  compatibleRegimes: Parameters<typeof buildMetadata>[0]["compatibleRegimes"];
  incompatibleRegimes: Parameters<typeof buildMetadata>[0]["incompatibleRegimes"];
  risks: readonly string[];
  evidences: readonly string[];
  timeHorizon: NonNullable<Parameters<typeof buildMetadata>[0]["timeHorizon"]>;
  idealConditions: readonly string[];
  unfavorableConditions: readonly string[];
  scoreFn: (ctx: {
    returns?: readonly number[];
    rsi?: number;
    volatility?: number;
    peRatio?: number;
    earningsGrowth?: number;
    qualityScore?: number;
    dividendYield?: number;
  }) => { score: number; summary: string; evidence: readonly string[]; metrics: Record<string, number> };
}): ExtendedStrategyFactory {
  return () =>
    new RuleBasedInvestmentStrategy({
      id: config.id,
      defaultSizePct: 4,
      metadata: buildMetadata({
        strategyId: config.id,
        name: config.name,
        assumptions: config.assumptions,
        limitations: config.limitations,
        compatibleRegimes: config.compatibleRegimes,
        incompatibleRegimes: config.incompatibleRegimes,
        risks: config.risks,
        evidences: config.evidences,
        compatibleMarkets: ["usa-equities", "europe-equities", "etf", "indices"],
        compatibleAssets: ["equity", "etf"],
        timeHorizon: config.timeHorizon,
        idealConditions: config.idealConditions,
        unfavorableConditions: config.unfavorableConditions,
        historicalPerformanceLevel: "mixed",
        currentConfidence: 0.55,
      }),
      hooks: {
        score(context) {
          const scored = config.scoreFn(context);
          const bias =
            scored.score > 0.12 ? "bullish" : scored.score < -0.12 ? "bearish" : "neutral";
          return { ...scored, bias, score: clampScore(scored.score) };
        },
        shouldEnter(_context, analysis) {
          if (Math.abs(analysis.score) < 0.35) return null;
          return {
            side: analysis.score > 0 ? "long" : "short",
            conviction: Math.min(1, Math.abs(analysis.score)),
            rationale: `${config.name} entry intent (analysis-only).`,
            evidence: analysis.evidence,
          };
        },
      },
    });
}

export const createSwingTradingStrategy = simpleScoreFactory({
  id: "swing-trading",
  name: "Swing Trading",
  assumptions: ["Multi-day swings persist with moderate volatility"],
  limitations: ["Overnight gap risk", "Needs liquid names"],
  compatibleRegimes: ["bullish", "bearish", "sideways"],
  incompatibleRegimes: ["high-volatility"],
  risks: ["gap risk", "false swings"],
  evidences: ["Swing high/low structure", "RSI mid-band turns"],
  timeHorizon: "swing",
  idealConditions: ["Clear swings", "Adequate liquidity"],
  unfavorableConditions: ["Choppy noise", "Event weeks"],
  scoreFn(ctx) {
    const mom = mean(ctx.returns) ?? 0;
    const rsi = ctx.rsi ?? 50;
    const score = mom * 8 + (rsi - 50) / 80;
    return {
      score,
      summary: `Swing score ${score.toFixed(3)} (rsi=${rsi}).`,
      evidence: [`meanReturn=${mom.toFixed(4)}`, `rsi=${rsi}`],
      metrics: { meanReturn: mom, rsi, score },
    };
  },
});

export const createPositionTradingStrategy = simpleScoreFactory({
  id: "position-trading",
  name: "Position Trading",
  assumptions: ["Multi-week trends dominate noise"],
  limitations: ["Slow to react", "Drawdown tolerance required"],
  compatibleRegimes: ["bullish", "bearish", "risk-on"],
  incompatibleRegimes: ["transition"],
  risks: ["regime change", "macro shocks"],
  evidences: ["Higher-timeframe trend", "Fundamental confirmation"],
  timeHorizon: "position",
  idealConditions: ["Stable macro", "Persistent trend"],
  unfavorableConditions: ["Whipsaw regimes"],
  scoreFn(ctx) {
    const mom = mean(ctx.returns) ?? 0;
    const score = mom * 15;
    return {
      score,
      summary: `Position score ${score.toFixed(3)}.`,
      evidence: [`meanReturn=${mom.toFixed(4)}`],
      metrics: { meanReturn: mom, score },
    };
  },
});

export const createRelativeStrengthStrategy = simpleScoreFactory({
  id: "relative-strength",
  name: "Relative Strength",
  assumptions: ["Leaders continue outperforming peers near-term"],
  limitations: ["Rotation can reverse quickly"],
  compatibleRegimes: ["bullish", "risk-on"],
  incompatibleRegimes: ["risk-off"],
  risks: ["leadership rotation", "crowding"],
  evidences: ["Relative return vs benchmark proxy"],
  timeHorizon: "swing",
  idealConditions: ["Broad uptrend", "Clear leadership"],
  unfavorableConditions: ["Factor rotation"],
  scoreFn(ctx) {
    const mom = mean(ctx.returns) ?? 0;
    const score = mom * 14;
    return {
      score,
      summary: `Relative strength proxy ${score.toFixed(3)}.`,
      evidence: [`meanReturn=${mom.toFixed(4)}`],
      metrics: { meanReturn: mom, score },
    };
  },
});

export const createPairsTradingStrategy = simpleScoreFactory({
  id: "pairs-trading",
  name: "Pairs Trading",
  assumptions: ["Spread mean-reverts within cointegrated pairs"],
  limitations: ["Requires pair context (stubbed when missing)"],
  compatibleRegimes: ["sideways", "low-volatility"],
  incompatibleRegimes: ["high-volatility", "transition"],
  risks: ["pair break", "correlation regime shift"],
  evidences: ["Spread z-score proxy from returns"],
  timeHorizon: "swing",
  idealConditions: ["Stable correlation", "Liquid pair"],
  unfavorableConditions: ["Idiosyncratic shocks"],
  scoreFn(ctx) {
    const mom = mean(ctx.returns) ?? 0;
    const score = -mom * 10;
    return {
      score,
      summary: `Pairs mean-reversion proxy ${score.toFixed(3)}.`,
      evidence: [`spreadProxy=${(-mom).toFixed(4)}`],
      metrics: { spreadProxy: -mom, score },
    };
  },
});

export const createSectorRotationStrategy = simpleScoreFactory({
  id: "sector-rotation",
  name: "Sector Rotation",
  assumptions: ["Sector leadership rotates with macro cycle"],
  limitations: ["Needs sector map; uses return proxy when missing"],
  compatibleRegimes: ["bullish", "risk-on", "transition"],
  incompatibleRegimes: ["high-volatility"],
  risks: ["false rotation signals"],
  evidences: ["Sector relative momentum proxy"],
  timeHorizon: "position",
  idealConditions: ["Clear macro regime"],
  unfavorableConditions: ["Uncorrelated idiosyncratic markets"],
  scoreFn(ctx) {
    const mom = mean(ctx.returns) ?? 0;
    const score = mom * 9;
    return {
      score,
      summary: `Sector rotation proxy ${score.toFixed(3)}.`,
      evidence: [`meanReturn=${mom.toFixed(4)}`],
      metrics: { meanReturn: mom, score },
    };
  },
});

export const createEventDrivenStrategy = simpleScoreFactory({
  id: "event-driven",
  name: "Event Driven",
  assumptions: ["Corporate/macro events create temporary mispricings"],
  limitations: ["Event calendar may be missing — stubs gracefully"],
  compatibleRegimes: ["transition", "high-volatility", "bullish", "bearish"],
  incompatibleRegimes: ["low-volatility"],
  risks: ["event cancellation", "gap risk"],
  evidences: ["Volatility + return shock proxy"],
  timeHorizon: "swing",
  idealConditions: ["Known catalysts"],
  unfavorableConditions: ["No calendar data"],
  scoreFn(ctx) {
    const mom = mean(ctx.returns) ?? 0;
    const vol = ctx.volatility ?? 0.2;
    const score = mom * 6 + (vol - 0.2) * 0.5;
    return {
      score,
      summary: `Event-driven proxy ${score.toFixed(3)}.`,
      evidence: [`meanReturn=${mom.toFixed(4)}`, `vol=${vol.toFixed(3)}`],
      metrics: { meanReturn: mom, volatility: vol, score },
    };
  },
});

export const createEarningsStrategy = simpleScoreFactory({
  id: "earnings",
  name: "Earnings",
  assumptions: ["Earnings revisions and surprises drive near-term returns"],
  limitations: ["Needs earnings feed; uses growth proxy"],
  compatibleRegimes: ["bullish", "bearish", "transition"],
  incompatibleRegimes: ["high-volatility"],
  risks: ["guidance miss", "post-earnings drift fade"],
  evidences: ["Earnings growth / PE proxy"],
  timeHorizon: "swing",
  idealConditions: ["Estimate revisions available"],
  unfavorableConditions: ["Silent period with no data"],
  scoreFn(ctx) {
    const growth = (ctx.earningsGrowth ?? 0) / 100;
    const peAdj = ctx.peRatio != null ? (20 - ctx.peRatio) / 40 : 0;
    const score = growth + peAdj;
    return {
      score,
      summary: `Earnings strategy score ${score.toFixed(3)}.`,
      evidence: [`earningsGrowth=${ctx.earningsGrowth ?? "NO_DATA"}`, `pe=${ctx.peRatio ?? "NO_DATA"}`],
      metrics: { earningsGrowth: ctx.earningsGrowth ?? 0, peRatio: ctx.peRatio ?? 0, score },
    };
  },
});

export const createCarryStrategy = simpleScoreFactory({
  id: "carry",
  name: "Carry",
  assumptions: ["Carry persists when funding and volatility are calm"],
  limitations: ["Most applicable to FX/rates; equity dividend proxy used"],
  compatibleRegimes: ["low-volatility", "risk-on"],
  incompatibleRegimes: ["high-volatility", "risk-off"],
  risks: ["carry crash", "funding shock"],
  evidences: ["Dividend / yield proxy"],
  timeHorizon: "position",
  idealConditions: ["Stable rates", "Calm vol"],
  unfavorableConditions: ["Risk-off spikes"],
  scoreFn(ctx) {
    const yieldPct = (ctx.dividendYield ?? 0) / 100;
    const volPenalty = (ctx.volatility ?? 0.2) > 0.3 ? -0.3 : 0.1;
    const score = yieldPct * 8 + volPenalty;
    return {
      score,
      summary: `Carry proxy ${score.toFixed(3)}.`,
      evidence: [`dividendYield=${ctx.dividendYield ?? "NO_DATA"}`],
      metrics: { dividendYield: ctx.dividendYield ?? 0, score },
    };
  },
});

export const createRebalancingStrategy = simpleScoreFactory({
  id: "rebalancing",
  name: "Rebalancing",
  assumptions: ["Periodic rebalancing harvests relative drift"],
  limitations: ["Requires portfolio weights; emits analysis signal only"],
  compatibleRegimes: ["sideways", "bullish", "bearish", "low-volatility"],
  incompatibleRegimes: ["high-volatility"],
  risks: ["turnover costs", "tax drag"],
  evidences: ["Drift vs target proxy from returns"],
  timeHorizon: "strategic",
  idealConditions: ["Defined target weights"],
  unfavorableConditions: ["High transaction costs"],
  scoreFn(ctx) {
    const mom = mean(ctx.returns) ?? 0;
    const score = -Math.sign(mom) * Math.min(0.5, Math.abs(mom) * 20);
    return {
      score,
      summary: `Rebalancing drift proxy ${score.toFixed(3)}.`,
      evidence: [`driftProxy=${mom.toFixed(4)}`],
      metrics: { driftProxy: mom, score },
    };
  },
});
