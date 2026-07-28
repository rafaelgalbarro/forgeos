export type {
  VentureRecommendation,
  ConfidenceLevel,
  ScenarioType,
  ScenarioMetrics,
  SimulatorAssumptions,
  VentureSimulatorInput,
  VentureSimulatorResult,
  VentureSimulatorOverrides,
} from "./types";

export { buildSimulatorAssumptions, listDataSources } from "./assumptions";
export { applySimulatorOverrides, hasActiveOverrides, overridesMatch } from "./overrides";
export {
  saveSimulatorOverrides,
  getSimulatorOverrides,
  clearSimulatorOverrides,
} from "./simulator-overrides-store";
export {
  resolveStartupScore,
  calculateVentureScore,
  estimateBreakEvenMonths,
  estimateLTV,
  extractRisks,
  extractOpportunities,
  extractAlternatives,
  deriveConfidence,
} from "./metrics";
export { buildScenario, buildAllScenarios } from "./scenario-builder";
export {
  recommendationLabel,
  deriveRecommendation,
  deriveSuggestedNextAction,
  attachRecommendationMeta,
} from "./recommendations";
export { runVentureSimulator, ventureToSimulatorInput } from "./simulator";
