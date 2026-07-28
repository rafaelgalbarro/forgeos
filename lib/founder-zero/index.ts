/** Program 4000 — First Venture Validation public API. */

export type * from "./types";
export {
  FOUNDER_ZERO_VERSION,
  FOUNDER_ZERO_DISCLAIMER,
} from "./types";

export { VALIDATION_PIPELINE, FOUNDER_ZERO_DEPARTMENT_IDS } from "./pipeline-stages";
export { buildValidationChecklist } from "./venture-checklist";
export { computeValidationProgress } from "./venture-progress";
export { computeVentureHealth } from "./venture-health";
export { buildVentureScoreBreakdown, ventureToIntelligenceInputs } from "./venture-score";
export { computeReadinessLevels } from "./venture-readiness";
export {
  readFounderZeroSession,
  writeFounderZeroSession,
  touchFounderZeroSession,
} from "./venture-session";
export {
  readValidationHistory,
  appendValidationHistory,
  clearValidationHistory,
} from "./venture-history";
export { generateValidationReports, formatFinalInforme } from "./venture-report";
export {
  runVentureValidationEngine,
  runFounderZeroLab,
  REUSED_MODULES,
} from "./venture-validation-engine";
