import type { ScenarioMetrics, ScenarioType, SimulatorAssumptions } from "./types";
import { estimateBreakEvenMonths, estimateLTV } from "./metrics";

interface ScenarioModifiers {
  userMultiplier: number;
  cacMultiplier: number;
  conversionMultiplier: number;
  churnMultiplier: number;
  revenueMultiplier: number;
  riskSuffix: string;
}

const SCENARIO_MODIFIERS: Record<ScenarioType, ScenarioModifiers> = {
  conservador: {
    userMultiplier: 0.55,
    cacMultiplier: 1.35,
    conversionMultiplier: 0.75,
    churnMultiplier: 1.25,
    revenueMultiplier: 0.85,
    riskSuffix: "Crecimiento más lento de lo previsto",
  },
  base: {
    userMultiplier: 1,
    cacMultiplier: 1,
    conversionMultiplier: 1,
    churnMultiplier: 1,
    revenueMultiplier: 1,
    riskSuffix: "",
  },
  optimista: {
    userMultiplier: 1.65,
    cacMultiplier: 0.78,
    conversionMultiplier: 1.3,
    churnMultiplier: 0.82,
    revenueMultiplier: 1.15,
    riskSuffix: "Ejecución impecable y timing favorable",
  },
};

export function buildScenario(
  type: ScenarioType,
  assumptions: SimulatorAssumptions
): ScenarioMetrics {
  const mod = SCENARIO_MODIFIERS[type];

  const year1Users = Math.round(assumptions.baseYear1Users * mod.userMultiplier);
  const year2Users = Math.round(assumptions.baseYear2Users * mod.userMultiplier);
  const estimatedCAC = Math.round(assumptions.baseCAC * mod.cacMultiplier);
  const estimatedConversion = Math.round(assumptions.baseConversion * mod.conversionMultiplier * 10) / 10;
  const estimatedChurn = Math.round(assumptions.baseChurnMonthly * mod.churnMultiplier * 10) / 10;

  const revY1PerUser = Math.round(assumptions.revenuePerUserYear1 * mod.revenueMultiplier);
  const revY2PerUser = Math.round(assumptions.revenuePerUserYear2 * mod.revenueMultiplier);

  const year1Revenue = year1Users * revY1PerUser;
  const year2Revenue = year2Users * revY2PerUser;

  const estimatedLTV = estimateLTV(revY1PerUser, estimatedChurn, assumptions);
  const breakEvenMonths = estimateBreakEvenMonths(
    year1Users,
    revY1PerUser,
    estimatedCAC,
    assumptions.monthlyBurnEstimate
  );

  const primaryRisk = mod.riskSuffix
    ? `${assumptions.primaryRisk} (${mod.riskSuffix})`
    : assumptions.primaryRisk;

  return {
    scenario: type,
    year1Users,
    year2Users,
    year1Revenue,
    year2Revenue,
    estimatedCAC,
    estimatedLTV,
    estimatedConversion,
    estimatedChurn,
    breakEvenMonths,
    acquisitionComplexity: assumptions.acquisitionComplexity,
    primaryRisk,
  };
}

export function buildAllScenarios(assumptions: SimulatorAssumptions): ScenarioMetrics[] {
  return (["conservador", "base", "optimista"] as ScenarioType[]).map((type) =>
    buildScenario(type, assumptions)
  );
}
