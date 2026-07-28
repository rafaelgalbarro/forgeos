/** Program 3000 Sprint 2 — seed timeline events for new ventures. */

import { recordVentureHistoryEvent } from "@/lib/intelligence-layer/history";
import type { FounderOnboardingState } from "./types";

export function seedInitialTimeline(ventureId: string, state: FounderOnboardingState): void {
  const now = new Date().toISOString();

  recordVentureHistoryEvent({
    ventureId,
    type: "founder_journey_started",
    title: "Recorrido fundador iniciado",
    description: `${state.profile.name || "Fundador"} completó el onboarding en ForgeOS.`,
    date: now,
    metadata: { source: "founder-journey", step: "onboarding" },
  });

  recordVentureHistoryEvent({
    ventureId,
    type: "venture_created",
    title: `Venture creada: ${state.venture.name}`,
    description: state.venture.idea.slice(0, 200),
    date: now,
    metadata: {
      category: state.market.category,
      targetAudience: state.market.targetAudience,
      priority: state.venture.priority,
    },
  });

  if (state.goals.length > 0) {
    recordVentureHistoryEvent({
      ventureId,
      type: "goals_defined",
      title: "Objetivos del fundador definidos",
      description: state.goals.join(" · "),
      date: now,
      metadata: { goals: state.goals },
    });
  }

  recordVentureHistoryEvent({
    ventureId,
    type: "ceo_briefing",
    title: "CEO Briefing completado",
    description: "El fundador revisó prioridades ejecutivas antes de entrar al OS.",
    date: now,
    metadata: { acknowledged: state.ceoBriefing.acknowledged },
  });
}
