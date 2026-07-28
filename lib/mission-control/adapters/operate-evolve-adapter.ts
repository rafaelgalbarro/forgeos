/** PROGRAM 5150 — OPERATE/EVOLVE phase preview (no external ops). */

import type { MissionSession, MissionArtifact, MissionPhase } from "../types";

export interface OperateEvolveResult {
  artifact: MissionArtifact;
  summary: string;
}

export function prepareOperateEvolvePreview(
  session: MissionSession,
  phase: "OPERATE" | "EVOLVE"
): OperateEvolveResult {
  const isOperate = phase === "OPERATE";

  const items = isOperate
    ? [
        "KPIs: MRR, churn, SLA compliance, NPS",
        "Roadmap: Q1-Q2 features priorizadas",
        "Backlog: 12 items demo",
        "Feedback: canal in-app + NPS survey",
        "Incidents: 0 activos (demo)",
      ]
    : [
        "Self-evolution: 3 recomendaciones",
        "Weekly CEO review: agenda preparada",
        "Mejoras: pricing, onboarding, mobile v2",
        "Retrospectiva: métricas vs plan",
      ];

  const artifact: MissionArtifact = {
    id: `art-${phase.toLowerCase()}-${Date.now()}`,
    type: "report",
    label: isOperate ? "Operate Preview" : "Evolve Preview",
    phase: phase as MissionPhase,
    source: "demo",
    summary: items.join(" · "),
    createdAt: new Date().toISOString(),
  };

  const summary = isOperate
    ? `OPERATE preparado (demo). KPIs, roadmap, backlog, feedback y NPS listos. Sin ops externas.`
    : `EVOLVE preparado (demo). Recomendaciones de auto-evolución y revisión CEO semanal. Misión lista para iterar.`;

  return { artifact, summary };
}
