/** Program 3000 Sprint 2 — seed venture memory and workspace prefs. */

import type { VentureProject } from "@/lib/domain/venture";
import { syncVentureMemory } from "@/lib/intelligence-layer/venture-memory";
import { addCeoBriefing } from "@/lib/intelligence-layer/ceo-memory";
import { updateUserPreferences } from "@/lib/workspace";
import { readSession } from "@/lib/auth/session-store";
import type { FounderOnboardingState } from "./types";
import { buildCeoWelcomeContent } from "./ceo-welcome";

export function seedInitialMemory(venture: VentureProject, state: FounderOnboardingState): void {
  syncVentureMemory(venture);

  const ceo = buildCeoWelcomeContent(state);
  addCeoBriefing({
    date: new Date().toISOString().slice(0, 10),
    summary: ceo.summary,
    highlights: ceo.priorities,
  });

  const session = readSession();
  if (session) {
    updateUserPreferences(session.userId, {
      locale: "es",
      defaultOptimizer: state.venture.priority === "high" ? "quality" : "balanced",
    });
  }
}
