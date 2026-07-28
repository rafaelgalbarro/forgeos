/** Thin adapter — Executive Mesh public API (summary only, no chain-of-thought). */

import type { ExecutiveCouncilSummary, Mission } from "../types";

export function getExecutiveCouncilSnapshot(mission: Mission): ExecutiveCouncilSummary {
  const departments = ["CEO", "CTO", "CMO", "CFO", "Legal"];
  const important = mission.pendingDecisions.some((d) => !d.resolved && d.important);

  return {
    visible: important,
    headline: "Consejo evaluando…",
    summary: important
      ? "El consejo recomienda validar branding y arquitectura antes de construir."
      : "Seguimiento rutinario — sin escalada ejecutiva.",
    departments,
    confidence: Math.min(95, mission.status.confidence + 10),
  };
}

/** Read-only mesh consult stub — does NOT invoke full mesh engine on first paint. */
export async function consultExecutiveMesh(topic: string): Promise<{ summary: string }> {
  return {
    summary: `Evaluación ejecutiva sobre "${topic.slice(0, 40)}" — consenso preliminar favorable.`,
  };
}
