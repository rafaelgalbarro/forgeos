/** PROGRAM 5800 — Lightweight SSR investor snapshot. */

import type { InvestorModeSnapshot } from "./types";
import { INVESTOR_MODE_VERSION } from "./types";

export function buildInvestorModeSnapshot(readinessScore = 0): InvestorModeSnapshot {
  const label =
    readinessScore >= 80
      ? "Listo para inversores"
      : readinessScore >= 60
        ? "Casi listo"
        : readinessScore >= 30
          ? "En preparación"
          : "Pendiente";

  return {
    version: INVESTOR_MODE_VERSION,
    generatedAt: new Date().toISOString(),
    readinessScore,
    readinessLabel: label,
    deliverableCount: 8,
    gaps: readinessScore < 60 ? ["Generar paquete inversor desde Mission Control"] : [],
  };
}

export function investorReadinessLabel(score: number): string {
  if (score >= 80) return "Listo para inversores";
  if (score >= 60) return "Casi listo";
  if (score >= 30) return "En preparación";
  return "Pendiente";
}
