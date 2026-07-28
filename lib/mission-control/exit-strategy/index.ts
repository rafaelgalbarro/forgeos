/** PROGRAM 5900 — Exit Strategy public API. */

export type * from "./types";
export {
  EXIT_STRATEGY_VERSION,
  EXIT_STRATEGY_STORAGE_PREFIX,
} from "./types";
export {
  EXIT_STRATEGIES,
  EXIT_STRATEGY_ORDER,
  getExitStrategyConfig,
  getExitStrategyLabel,
} from "./exit-strategy-registry";
export {
  readExitStrategySelection,
  writeExitStrategySelection,
  clearExitStrategySelection,
  selectExitStrategy,
  detectExitStrategyFromText,
  parseExitStrategyChoice,
  EXIT_STRATEGY_CLARIFYING_QUESTION,
} from "./exit-strategy-selector";
export {
  generateAdaptationPlan,
  adaptationDomainsChanged,
} from "./strategy-adaptations";
export { computeExitReadiness } from "./exit-readiness-scorer";
export { computeStrategicAlignment } from "./strategic-alignment";
export {
  computeDecisionImpacts,
  getDecisionImpactForId,
  impactLabelEs,
  impactVariant,
} from "./decision-impact";
export {
  orchestrateExitStrategyChange,
  getActiveExitStrategy,
  shouldShowExitStrategy,
  buildExitMetrics,
  refreshExitStrategyOnTurn,
  buildFullExitSnapshot,
  detectExitStrategyIntent,
} from "./exit-orchestrator";
export {
  buildEmptyExitSnapshot,
  buildExitStrategySnapshot,
  exitSnapshotSummary,
} from "./exit-snapshots";
export { buildRoadmapAdaptation } from "./adapters/roadmap-adapter";
export { buildFinanzasAdaptation, fetchInvestorContext } from "./adapters/investor-adapter";
export { buildMarketingAdaptation, fetchGTMContext } from "./adapters/gtm-adapter";
export { buildProductoAdaptation, applyProductSnapshotAdjustments } from "./adapters/product-adapter";
