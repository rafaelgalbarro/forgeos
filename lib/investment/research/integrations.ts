/**
 * Thin integration facades — export/read models for peer modules.
 * No duplication of Alpha/Risk/Committee logic; consumers import these keys.
 */

export function researchIntegrationFacades(): Readonly<Record<string, string>> {
  return {
    brain: "read:research.dossier.executiveSummary + research.scores",
    alpha: "read:research.opportunities + research.scores.overall",
    strategyLab: "read:research.engines.quant + research.engines.technical",
    risk: "read:research.scores.risk + research.alerts",
    portfolio: "read:research.watchlists + research.dossiers",
    opportunities: "deep-link:/investment/research?symbol= + research.opportunities",
    committee: "read:research.memory + research.dossier",
    reports: "read:research.memory (append-only versions)",
  };
}

/** Stable export shape for other modules (import without pulling orchestrator I/O). */
export type ResearchReadModelRef = {
  readonly module: keyof ReturnType<typeof researchIntegrationFacades>;
  readonly path: string;
  readonly mode: "ANALYSIS_ONLY";
};

export function listResearchReadModels(): readonly ResearchReadModelRef[] {
  const facades = researchIntegrationFacades();
  return (Object.keys(facades) as (keyof typeof facades)[]).map((module) => ({
    module,
    path: facades[module],
    mode: "ANALYSIS_ONLY" as const,
  }));
}
