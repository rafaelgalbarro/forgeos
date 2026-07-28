/** Program 3000 Sprint 2 — seed knowledge entries for new ventures. */

import { wrapKnowledgeEntry } from "@/lib/intelligence-layer/knowledge-evolution";
import type { KnowledgeEntryBase } from "@/lib/knowledge";
import type { FounderOnboardingState } from "./types";

function makeEntry(
  id: string,
  domain: KnowledgeEntryBase["domain"],
  title: string,
  description: string,
  tags: string[]
): KnowledgeEntryBase {
  const now = new Date().toISOString();
  return {
    id,
    domain,
    title,
    description,
    tags,
    version: "1.0",
    createdAt: now,
    updatedAt: now,
    workerIds: [],
  };
}

export function seedInitialKnowledge(ventureId: string, state: FounderOnboardingState): void {
  const entries: KnowledgeEntryBase[] = [];

  if (state.market.targetAudience) {
    entries.push(
      makeEntry(
        `fj-audience-${ventureId}`,
        "business-models",
        "Audiencia objetivo",
        state.market.targetAudience,
        ["founder-journey", "market", "onboarding"]
      )
    );
  }

  if (state.market.competitors) {
    entries.push(
      makeEntry(
        `fj-competitors-${ventureId}`,
        "competitors",
        "Panorama competitivo",
        state.market.competitors,
        ["founder-journey", "competitors", "onboarding"]
      )
    );
  }

  if (state.venture.idea) {
    entries.push(
      makeEntry(
        `fj-idea-${ventureId}`,
        "features",
        `Idea: ${state.venture.name}`,
        state.venture.idea,
        ["founder-journey", "idea", "onboarding"]
      )
    );
  }

  for (const goal of state.goals) {
    entries.push(
      makeEntry(
        `fj-goal-${ventureId}-${goal.slice(0, 12).replace(/\s/g, "-")}`,
        "patterns",
        "Objetivo del fundador",
        goal,
        ["founder-journey", "goals", "onboarding"]
      )
    );
  }

  for (const entry of entries) {
    wrapKnowledgeEntry(entry, {
      origin: "venture",
      priority: "high",
      ventureIds: [ventureId],
      category: entry.domain,
      notes: "Generado durante onboarding del fundador (Sprint 2)",
    });
  }
}
