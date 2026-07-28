import type { FounderJourneySnapshot, JourneyPhaseState, JourneyTimelineEntry } from "./types";

export function buildJourneyTimeline(phases: JourneyPhaseState[]): JourneyTimelineEntry[] {
  return phases.map((phase) => ({
    phaseId: phase.id,
    label: phase.label,
    status: phase.status,
    progress: phase.progress,
    time: phase.estimatedTime,
    description: timelineDescription(phase),
  }));
}

function timelineDescription(phase: JourneyPhaseState): string {
  if (phase.status === "complete") return phase.valueGenerated;
  if (phase.executiveNote) return phase.executiveNote;
  if (phase.blockers.length > 0) return phase.blockers[0].label;
  return phase.nextAction?.description ?? phase.objetivo;
}

export function groupTimelineByMilestone(
  snapshot: FounderJourneySnapshot
): { label: string; phases: JourneyTimelineEntry[] }[] {
  const validation = snapshot.phases.filter((p) =>
    ["idea", "discovery", "validacion", "research", "competidores"].includes(p.id)
  );
  const executive = snapshot.phases.filter((p) =>
    ["ceo-review", "board-decision"].includes(p.id)
  );
  const product = snapshot.phases.filter((p) =>
    ["product", "architecture", "ux"].includes(p.id)
  );
  const delivery = snapshot.phases.filter((p) =>
    ["build", "qa", "deployment", "launch", "growth"].includes(p.id)
  );

  return [
    { label: "Validación", phases: validation.map(toEntry) },
    { label: "Gobernanza", phases: executive.map(toEntry) },
    { label: "Producto", phases: product.map(toEntry) },
    { label: "Entrega", phases: delivery.map(toEntry) },
  ];
}

function toEntry(phase: JourneyPhaseState): JourneyTimelineEntry {
  return {
    phaseId: phase.id,
    label: phase.label,
    status: phase.status,
    progress: phase.progress,
    time: phase.estimatedTime,
    description: timelineDescription(phase),
  };
}

/** Maps Epic 7.1 phases to the coarser Epic 7.0 user pipeline for display */
export const USER_PIPELINE_GROUPS = [
  { id: "idea", label: "Idea", phaseIds: ["idea"] },
  { id: "validacion", label: "Validación", phaseIds: ["discovery", "validacion", "research", "competidores"] },
  { id: "mercado", label: "Mercado", phaseIds: ["research", "competidores", "ceo-review", "board-decision"] },
  { id: "producto", label: "Producto", phaseIds: ["product", "architecture", "ux"] },
  { id: "construccion", label: "Construcción", phaseIds: ["build", "qa", "deployment"] },
  { id: "lanzamiento", label: "Lanzamiento", phaseIds: ["launch"] },
  { id: "crecimiento", label: "Crecimiento", phaseIds: ["growth"] },
] as const;

export function computeUserPipelineProgress(snapshot: FounderJourneySnapshot): {
  id: string;
  label: string;
  progress: number;
  active: boolean;
}[] {
  const phaseMap = new Map(snapshot.phases.map((p) => [p.id, p]));

  return USER_PIPELINE_GROUPS.map((group) => {
    const groupPhases = group.phaseIds
      .map((id) => phaseMap.get(id))
      .filter((p): p is JourneyPhaseState => !!p);
    const progress = Math.round(
      groupPhases.reduce((sum, p) => sum + p.progress, 0) / groupPhases.length
    );
    const active = groupPhases.some((p) => p.status === "active" || p.status === "blocked");
    return { id: group.id, label: group.label, progress, active };
  });
}
