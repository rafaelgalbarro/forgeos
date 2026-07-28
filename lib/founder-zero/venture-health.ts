/** Program 4000 — Venture health score. */

import type { ValidationStage, VentureHealthSnapshot } from "./types";

export function computeVentureHealth(stages: ValidationStage[]): VentureHealthSnapshot {
  const blocked = stages.filter((s) => s.status === "blocked");
  const notStarted = stages.filter((s) => s.status === "not_started");
  const completed = stages.filter((s) => s.status === "completed");
  const inProgress = stages.filter((s) => s.status === "in_progress");

  const blockers = blocked.map((s) => `${s.label}: ${s.resultSummary}`);
  const warnings = [
    ...inProgress.map((s) => `En progreso: ${s.label}`),
    ...notStarted.slice(0, 3).map((s) => `Pendiente: ${s.label}`),
  ];

  const base = Math.round((completed.length / Math.max(stages.length, 1)) * 70);
  const penalty = blocked.length * 8 + notStarted.length * 2;
  const score = Math.max(0, Math.min(100, base + 15 - penalty));

  let label = "Crítico";
  if (score >= 80) label = "Excelente";
  else if (score >= 65) label = "Saludable";
  else if (score >= 45) label = "En desarrollo";
  else if (score >= 25) label = "Frágil";

  return { score, label, blockers, warnings };
}
