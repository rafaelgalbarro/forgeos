import {
  DEFAULT_RISK_POLICY,
  ensureRiskContext,
  ensureRiskPolicy,
  type BlockReason,
  type OperationRiskContext,
  type RiskCheckResult,
  type RiskMetricSnapshot,
  type RiskPolicy,
  type RiskValidationResult,
} from "../domain/risk";

const SQRT_TWO_PI = Math.sqrt(2 * Math.PI);

/**
 * Institutional risk formulas and assumptions:
 * - Requested position % = tradeNotional / portfolioValue * 100
 * - Projected risk % = projectedPosition% * annualizedVol%
 * - Parametric VaR % = projectedPosition% * vol * z(alpha) * sqrt(horizon/252)
 * - CVaR % = VaR * phi(z) / (1 - alpha) using a Normal tail approximation
 * - Kelly % = ((b * p - q) / b) * kellyFractionCap, with b=reward/risk and q=1-p
 * - Liquidity score = 1 - participationRate - spreadPenalty
 * - Recommended stop = max(minStop, 1.5 * vol, 5 * bidAskSpread)
 * Assumes one-day horizon by default, Gaussian returns, and static exposures.
 */

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function round(value: number): number {
  return Number(value.toFixed(4));
}

function normalPdf(z: number): number {
  return Math.exp(-(z * z) / 2) / SQRT_TWO_PI;
}

function inverseStandardNormal(p: number): number {
  const pp = clamp(p, 0.5001, 0.9999);
  const a = [
    -3.969683028665376e1,
    2.209460984245205e2,
    -2.759285104469687e2,
    1.38357751867269e2,
    -3.066479806614716e1,
    2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1,
    1.615858368580409e2,
    -1.556989798598866e2,
    6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3,
    -3.223964580411365e-1,
    -2.400758277161838,
    -2.549732539343734,
    4.374664141464968,
    2.938163982698783,
  ];
  const d = [
    7.784695709041462e-3,
    3.224671290700398e-1,
    2.445134137142996,
    3.754408661907416,
  ];
  const plow = 0.02425;
  const phigh = 1 - plow;

  if (pp < plow) {
    const q = Math.sqrt(-2 * Math.log(pp));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (pp > phigh) {
    const q = Math.sqrt(-2 * Math.log(1 - pp));
    return -(
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  const q = pp - 0.5;
  const r = q * q;
  return (
    (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
    (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
  );
}

export class RiskValidationService {
  validateOperation(
    input: OperationRiskContext,
    policy: RiskPolicy = DEFAULT_RISK_POLICY,
  ): RiskValidationResult {
    const safePolicy = ensureRiskPolicy(policy);
    const context = ensureRiskContext(input);
    const metrics = this.computeMetrics(context, safePolicy);

    const checks: RiskCheckResult[] = [
      this.check("posición máxima", metrics.projectedPositionPct <= safePolicy.maxPositionPct, metrics.projectedPositionPct, safePolicy.maxPositionPct),
      this.check("riesgo máximo", metrics.projectedRiskPct <= safePolicy.maxRiskPct, metrics.projectedRiskPct, safePolicy.maxRiskPct),
      this.check("sector máximo", metrics.projectedSectorPct <= safePolicy.maxSectorPct, metrics.projectedSectorPct, safePolicy.maxSectorPct),
      this.check("país máximo", metrics.projectedCountryPct <= safePolicy.maxCountryPct, metrics.projectedCountryPct, safePolicy.maxCountryPct),
      this.check("divisa máxima", metrics.projectedCurrencyPct <= safePolicy.maxCurrencyPct, metrics.projectedCurrencyPct, safePolicy.maxCurrencyPct),
      this.check("drawdown máximo", metrics.projectedDrawdownPct <= safePolicy.maxDrawdownPct, metrics.projectedDrawdownPct, safePolicy.maxDrawdownPct),
      this.check("VaR", metrics.varPct <= safePolicy.maxVarPct, metrics.varPct, safePolicy.maxVarPct),
      this.check("CVaR", metrics.cvarPct <= safePolicy.maxCvarPct, metrics.cvarPct, safePolicy.maxCvarPct),
      this.check("Kelly", metrics.requestedPositionPct <= metrics.kellyPct, metrics.requestedPositionPct, metrics.kellyPct),
      this.check("Maximum Exposure", metrics.projectedExposurePct <= safePolicy.maxExposurePct, metrics.projectedExposurePct, safePolicy.maxExposurePct),
      this.check("Liquidity", metrics.liquidityScore >= safePolicy.minLiquidityScore, metrics.liquidityScore, safePolicy.minLiquidityScore),
      this.check("Position Size", metrics.requestedPositionPct <= metrics.recommendedPositionSizePct, metrics.requestedPositionPct, metrics.recommendedPositionSizePct),
    ];

    const blockReasons = checks
      .filter((check) => !check.passed)
      .map<BlockReason>((check) => ({
        code: `RISK_${check.rule.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
        rule: check.rule,
        message: `${check.rule} failed: actual ${check.actual} vs limit ${check.limit}`,
        actual: check.actual,
        limit: check.limit,
      }));

    return {
      status: blockReasons.length === 0 ? "ALLOWED" : "BLOCKED",
      checks,
      blockReasons,
      metrics,
      recommendations: {
        stopLossPct: metrics.recommendedStopLossPct,
        takeProfitPct: metrics.recommendedTakeProfitPct,
        positionSizePct: metrics.recommendedPositionSizePct,
      },
      explanation:
        blockReasons.length === 0
          ? "Operation passed all institutional risk checks."
          : `Operation blocked by ${blockReasons.length} risk rule(s): ${blockReasons
              .map((reason) => reason.rule)
              .join(", ")}.`,
    };
  }

  private computeMetrics(context: OperationRiskContext, policy: RiskPolicy): RiskMetricSnapshot {
    const tradeNotional = context.quantity * context.price;
    const requestedPositionPct = (tradeNotional / context.portfolioValue) * 100;
    const projectedPositionPct = context.currentPositionPct + requestedPositionPct;
    const projectedSectorPct = context.currentSectorExposurePct + requestedPositionPct;
    const projectedCountryPct = context.currentCountryExposurePct + requestedPositionPct;
    const projectedCurrencyPct = context.currentCurrencyExposurePct + requestedPositionPct;
    const projectedRiskPct = projectedPositionPct * (context.volatilityPct / 100);
    const projectedDrawdownPct = context.currentDrawdownPct + projectedRiskPct * 0.5;

    const z = inverseStandardNormal(policy.confidenceLevel);
    const horizonScale = Math.sqrt(policy.horizonDays / 252);
    const varPct = projectedPositionPct * (context.volatilityPct / 100) * z * horizonScale;
    const cvarPct = varPct * (normalPdf(z) / (1 - policy.confidenceLevel));
    const rewardRiskRatio = Math.max(
      policy.targetRewardRiskRatio,
      context.expectedReturnPct / Math.max(policy.minStopLossPct, 0.01),
    );
    const winProb = clamp(context.confidence, 0.01, 0.99);
    const kellyRaw = ((rewardRiskRatio * winProb - (1 - winProb)) / rewardRiskRatio) * 100;
    const kellyPct = clamp(kellyRaw * policy.kellyFractionCap, 0, 100);
    const projectedExposurePct = context.currentGrossExposurePct + requestedPositionPct;

    const volumeParticipation = context.quantity / context.avgDailyVolume;
    const spreadPenalty = clamp(context.bidAskSpreadPct / 2, 0, 1);
    const liquidityScore = clamp(1 - volumeParticipation - spreadPenalty, 0, 1);

    const recommendedStopLossPct = Math.max(
      policy.minStopLossPct,
      context.volatilityPct * 1.5,
      context.bidAskSpreadPct * 5,
    );
    const recommendedTakeProfitPct = recommendedStopLossPct * policy.targetRewardRiskRatio;

    const maxByVar =
      (policy.maxVarPct / Math.max((context.volatilityPct / 100) * z * horizonScale, 0.0001)) || 0;
    const maxByLiquidity =
      ((policy.maxParticipationRate * context.avgDailyVolume * context.price) /
        context.portfolioValue) *
      100;
    const exposureHeadroom = policy.maxExposurePct - context.currentGrossExposurePct;
    const sectorHeadroom = policy.maxSectorPct - context.currentSectorExposurePct;
    const countryHeadroom = policy.maxCountryPct - context.currentCountryExposurePct;
    const currencyHeadroom = policy.maxCurrencyPct - context.currentCurrencyExposurePct;
    const recommendedPositionSizePct = clamp(
      Math.min(
        policy.maxPositionPct,
        kellyPct || policy.maxPositionPct,
        maxByVar,
        maxByLiquidity,
        exposureHeadroom,
        sectorHeadroom,
        countryHeadroom,
        currencyHeadroom,
      ),
      0,
      policy.maxPositionPct,
    );

    return {
      tradeNotional: round(tradeNotional),
      requestedPositionPct: round(requestedPositionPct),
      projectedPositionPct: round(projectedPositionPct),
      projectedSectorPct: round(projectedSectorPct),
      projectedCountryPct: round(projectedCountryPct),
      projectedCurrencyPct: round(projectedCurrencyPct),
      projectedRiskPct: round(projectedRiskPct),
      projectedDrawdownPct: round(projectedDrawdownPct),
      varPct: round(varPct),
      cvarPct: round(cvarPct),
      kellyPct: round(kellyPct),
      projectedExposurePct: round(projectedExposurePct),
      liquidityScore: round(liquidityScore),
      participationRate: round(volumeParticipation),
      recommendedStopLossPct: round(recommendedStopLossPct),
      recommendedTakeProfitPct: round(recommendedTakeProfitPct),
      recommendedPositionSizePct: round(recommendedPositionSizePct),
    };
  }

  private check(rule: string, passed: boolean, actual: number, limit: number): RiskCheckResult {
    return {
      rule,
      passed,
      details: passed ? `${rule} passed` : `${rule} breached`,
      actual: round(actual),
      limit: round(limit),
    };
  }
}
