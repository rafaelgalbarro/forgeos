/**
 * Public research module exports.
 * Prefer orchestrator for dashboard; scoring/memory are pure/unit-testable.
 */

export type * from "./types";
export { composeResearchScores } from "./scoring";
export {
  appendResearchMemory,
  listResearchMemoryEntries,
  readResearchMemoryIndex,
  readResearchMemoryEntry,
  compareResearchMemory,
} from "./memory";
export { listResearchEngines, getResearchEngine, buildEngineRegistryRows } from "./registry";
export { buildInvestmentDossier } from "./dossier";
export { buildIntelligentWatchlists } from "./watchlists";
export { buildExecutiveSummary } from "./engines/ai-researcher";
export { researchIntegrationFacades, listResearchReadModels } from "./integrations";
export { clearResearchCache, researchCacheKey } from "./cache";
export { researchDossierHref, researchApiHref } from "./deep-links";
