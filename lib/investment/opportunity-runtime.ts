import { createAnalysisOnlyOpportunityScanner } from "@/src/core/investment/opportunity";

type RuntimeState = {
  scanner: ReturnType<typeof createAnalysisOnlyOpportunityScanner>;
};

declare global {
  var __forgeosInstitutionalOpportunityRuntime: RuntimeState | undefined;
}

export function getInstitutionalOpportunityRuntime(): RuntimeState {
  if (!globalThis.__forgeosInstitutionalOpportunityRuntime) {
    globalThis.__forgeosInstitutionalOpportunityRuntime = {
      scanner: createAnalysisOnlyOpportunityScanner({
        // Crypto only when capability flag is true — default remains false.
        capabilities: { crypto: false },
      }),
    };
  }
  return globalThis.__forgeosInstitutionalOpportunityRuntime;
}

/** @deprecated Prefer getInstitutionalOpportunityRuntime — kept for route compatibility. */
export function getOpportunityScannerRuntime(): RuntimeState {
  return getInstitutionalOpportunityRuntime();
}
