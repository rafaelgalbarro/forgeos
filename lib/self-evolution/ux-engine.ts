/** Program 2035 — UX analysis heuristics. */

import type { AffectedArea } from "./types";

export interface UxIssue {
  id: string;
  title: string;
  area: AffectedArea;
  type: "a11y" | "flow" | "feedback" | "navigation";
  severity: "low" | "medium" | "high";
  description: string;
}

const UX_ISSUES: UxIssue[] = [
  {
    id: "ux-founder-dropoff",
    title: "Abandono en onboarding fundador",
    area: "founder",
    type: "flow",
    severity: "high",
    description: "62% abandona en paso 2 del wizard.",
  },
  {
    id: "ux-a11y-capital",
    title: "Botones sin aria-label",
    area: "capital",
    type: "a11y",
    severity: "medium",
    description: "3 controles sin etiqueta accesible.",
  },
  {
    id: "ux-live-loading",
    title: "Skeleton ausente en Live dashboard",
    area: "live",
    type: "feedback",
    severity: "low",
    description: "Flash de contenido vacío al cargar.",
  },
  {
    id: "ux-ceo-nav",
    title: "Ruta CEO poco descubrible",
    area: "ceo",
    type: "navigation",
    severity: "medium",
    description: "Solo accesible desde OS labs.",
  },
];

export function analyzeUx(): UxIssue[] {
  return [...UX_ISSUES];
}

export function getUxScore(issues: UxIssue[]): number {
  if (issues.length === 0) return 100;
  const penalty = issues.reduce((sum, i) => {
    const w = i.severity === "high" ? 15 : i.severity === "medium" ? 8 : 4;
    return sum + w;
  }, 0);
  return Math.max(0, 100 - penalty);
}
