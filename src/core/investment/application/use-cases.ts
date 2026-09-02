import {
  ensureInvestmentDecision,
  ensureInvestmentReport,
  ensureMarketSignal,
  ensureMarketSnapshot,
  ensurePortfolioSnapshot,
  type AllocationProposal,
  type InvestmentDecision,
  type InvestmentReport,
  type MarketSignal,
  type MarketSnapshot,
  type PortfolioSnapshot,
  type Recommendation,
  type RiskAssessment,
} from "../domain";

export interface InvestmentAnalysisInput {
  readonly marketSnapshot: MarketSnapshot;
  readonly portfolioSnapshot: PortfolioSnapshot;
  readonly signals: readonly MarketSignal[];
}

export function produceInvestmentDecision(input: InvestmentAnalysisInput): InvestmentDecision {
  const marketSnapshot = ensureMarketSnapshot(input.marketSnapshot);
  const portfolioSnapshot = ensurePortfolioSnapshot(input.portfolioSnapshot);
  const signals = input.signals.map(ensureMarketSignal);

  const signedSignalScore = signals.reduce((acc, signal) => {
    if (signal.direction === "positive") return acc + signal.strength;
    if (signal.direction === "negative") return acc - signal.strength;
    return acc;
  }, 0);

  const concentrationRisk = portfolioSnapshot.positions.reduce(
    (highestWeight, position) => Math.max(highestWeight, position.weightPct),
    0,
  );
  const marketStress = (marketSnapshot.volatilityIndex + (100 - marketSnapshot.liquidityIndex)) / 2;
  const riskPressure = (concentrationRisk + marketStress) / 200;

  const recommendation: Recommendation =
    riskPressure > 0.65
      ? "de-risk"
      : signedSignalScore > 0.75
        ? "accumulate"
        : signedSignalScore < -0.5
          ? "rebalance"
          : "hold";

  const confidence = Math.max(
    0,
    Math.min(1, 0.45 + Math.abs(signedSignalScore) * 0.2 + signals.length * 0.03 - riskPressure * 0.1),
  );

  const reasoning = [
    `Signal bias score is ${signedSignalScore.toFixed(2)} across ${signals.length} signals.`,
    `Portfolio max position weight is ${concentrationRisk.toFixed(2)}%.`,
    `Market stress index computed at ${marketStress.toFixed(2)}%.`,
  ];

  const risks = [
    `Concentration risk at ${concentrationRisk.toFixed(2)}%.`,
    `Liquidity-adjusted stress at ${marketStress.toFixed(2)}%.`,
  ];

  const evidence = [
    ...signals.flatMap((signal) => signal.evidence),
    ...marketSnapshot.macroSignals,
    `Cash ratio currently at ${portfolioSnapshot.cashRatioPct.toFixed(2)}%.`,
  ];

  const usedSources = Array.from(
    new Set([
      ...marketSnapshot.sources,
      ...portfolioSnapshot.sources,
      ...signals.map((signal) => signal.source),
    ]),
  );

  return ensureInvestmentDecision({
    recommendation,
    confidence,
    reasoning,
    risks,
    evidence,
    usedSources,
  });
}

export function produceRiskAssessment(input: InvestmentAnalysisInput): RiskAssessment {
  const marketSnapshot = ensureMarketSnapshot(input.marketSnapshot);
  const portfolioSnapshot = ensurePortfolioSnapshot(input.portfolioSnapshot);

  const concentrationRiskPct = portfolioSnapshot.positions.reduce(
    (highestWeight, position) => Math.max(highestWeight, position.weightPct),
    0,
  );
  const liquidityRiskPct = 100 - marketSnapshot.liquidityIndex;
  const expectedDrawdownPct =
    Math.min(
      100,
      portfolioSnapshot.constraints.maxDrawdownPct * 0.6 +
        marketSnapshot.volatilityIndex * 0.25 +
        concentrationRiskPct * 0.15,
    ) || 0;

  const level: RiskAssessment["level"] =
    expectedDrawdownPct > 30 || concentrationRiskPct > 35 || liquidityRiskPct > 65
      ? "high"
      : expectedDrawdownPct > 15 || concentrationRiskPct > 20 || liquidityRiskPct > 40
        ? "medium"
        : "low";

  return {
    level,
    concentrationRiskPct,
    liquidityRiskPct,
    expectedDrawdownPct,
    factors: [
      `Maximum position concentration is ${concentrationRiskPct.toFixed(2)}%.`,
      `Liquidity risk estimated from market depth at ${liquidityRiskPct.toFixed(2)}%.`,
      `Expected drawdown is ${expectedDrawdownPct.toFixed(2)}%.`,
    ],
  };
}

export function produceAllocationProposal(input: InvestmentAnalysisInput): AllocationProposal {
  const marketSnapshot = ensureMarketSnapshot(input.marketSnapshot);
  const portfolioSnapshot = ensurePortfolioSnapshot(input.portfolioSnapshot);

  const defensiveTilt = marketSnapshot.regime === "bearish" ? 25 : marketSnapshot.regime === "transition" ? 20 : 15;
  const targetCashPct = Math.max(portfolioSnapshot.constraints.minCashPct, defensiveTilt - 5);
  const targetDefensivePct = defensiveTilt;
  const targetEquityPct = Math.max(0, 100 - targetCashPct - targetDefensivePct);

  const averageWeight =
    portfolioSnapshot.positions.length === 0
      ? 0
      : targetEquityPct / portfolioSnapshot.positions.length;

  const adjustments = portfolioSnapshot.positions.map((position) => {
    const deltaPct = Number((averageWeight - position.weightPct).toFixed(2));
    return {
      symbol: position.symbol,
      action: deltaPct > 1 ? "increase" : deltaPct < -1 ? "decrease" : "hold",
      deltaPct,
      rationale:
        deltaPct === 0
          ? "Position aligned with target profile."
          : "Adjustment proposed to align with portfolio risk budget.",
    } as const;
  });

  return {
    targetCashPct,
    targetEquityPct,
    targetDefensivePct,
    adjustments,
  };
}

export function produceInvestmentReport(input: InvestmentAnalysisInput): InvestmentReport {
  const marketSnapshot = ensureMarketSnapshot(input.marketSnapshot);
  const portfolioSnapshot = ensurePortfolioSnapshot(input.portfolioSnapshot);
  const signals = input.signals.map(ensureMarketSignal);
  const decision = produceInvestmentDecision({ marketSnapshot, portfolioSnapshot, signals });
  const riskAssessment = produceRiskAssessment({ marketSnapshot, portfolioSnapshot, signals });
  const allocationProposal = produceAllocationProposal({
    marketSnapshot,
    portfolioSnapshot,
    signals,
  });

  return ensureInvestmentReport({
    generatedAt: new Date().toISOString(),
    marketSnapshot,
    portfolioSnapshot,
    signals,
    decision,
    riskAssessment,
    allocationProposal,
  });
}
