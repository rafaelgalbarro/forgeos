/** Program 10000 — Generic Venture E2E public API. */

export type * from "./types";
export { VENTURE_E2E_VERSION, VENTURE_E2E_DISCLAIMER } from "./types";
export { E2E_PIPELINE, E2E_DEPARTMENT_IDS } from "./pipeline-stages";
export {
  listVentureFixtures,
  resolveVentureFixture,
  resolveVentureProject,
  isValidVentureProject,
  ensureFixtureVentureSeeded,
} from "./fixture-registry";
export { buildE2EChecklist } from "./venture-checklist";
export { computeE2EProgress } from "./venture-progress";
export { computeE2EReadiness } from "./venture-readiness";
export { generateE2EReports, formatE2EFinalInforme } from "./venture-report";
export { runVentureE2EEngine, REUSED_MODULES } from "./venture-e2e-engine";
