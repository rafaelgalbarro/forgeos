/** Program 3000 Sprint 2 — CEO Welcome content for onboarding & workspace. */

import type { CeoWelcomeContent, FounderOnboardingState } from "./types";
import { getFounderOnboardingState } from "./onboarding-wizard";

export function buildCeoWelcomeContent(
  onboarding?: FounderOnboardingState
): CeoWelcomeContent {
  const state = onboarding ?? getFounderOnboardingState();
  const ventureName = state.venture.name || "tu venture";
  const company = state.company.companyName || "tu organización";

  const defaultPriorities = [
    `Validar ${ventureName} con datos de mercado reales`,
    "Completar Discovery antes de autorizar build",
    "Alinear equipo ejecutivo con objetivos del fundador",
  ];

  const priorities =
    state.ceoBriefing.priorities.length > 0
      ? state.ceoBriefing.priorities
      : state.goals.length > 0
        ? state.goals.slice(0, 3)
        : defaultPriorities;

  return {
    headline: "Briefing del CEO AI",
    summary: `Como fundador de ${company}, tu venture ${ventureName} entra en fase de inteligencia. El equipo ejecutivo de ForgeOS te acompañará desde validación hasta lanzamiento.`,
    priorities,
    recommendations: [
      "Revisa el análisis de inteligencia antes de aprobar el build",
      "Usa el Venture Simulator para decisiones de board",
      "Mantén el contexto de mercado actualizado en Knowledge",
    ],
    cta: { label: "Ir al CEO Dashboard", href: "/os/ceo" },
  };
}

export function buildCeoBriefingPriorities(state: FounderOnboardingState): string[] {
  const items: string[] = [];
  if (state.goals[0]) items.push(state.goals[0]);
  if (state.market.targetAudience) {
    items.push(`Audiencia: ${state.market.targetAudience}`);
  }
  if (state.venture.idea) {
    items.push(`Idea: ${state.venture.idea.slice(0, 80)}${state.venture.idea.length > 80 ? "…" : ""}`);
  }
  return items.slice(0, 5);
}
