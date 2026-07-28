/** Program 3000 Sprint 2 — Founder Journey Manager (unified flow orchestration). */

import type { VentureProject } from "@/lib/domain/venture";
import { saveVenture } from "@/lib/store/ventures";
import { getActiveWorkspaceContext, linkVentureToWorkspace, updateUserPreferences } from "@/lib/workspace";
import { updateProfile } from "@/lib/auth";
import { readSession } from "@/lib/auth/session-store";
import type { FounderJourneyCompletionResult, FounderOnboardingState } from "./types";
import {
  completeFounderOnboarding,
  getFounderOnboardingState,
  isFounderOnboardingComplete,
} from "./onboarding-wizard";
import { markMilestoneComplete } from "./progress-tracker";
import { setJourneyVenture } from "./journey-store";
import { seedInitialTimeline } from "./initial-timeline";
import { seedInitialKnowledge } from "./initial-knowledge";
import { seedInitialMemory } from "./initial-memory";
import { buildCeoBriefingPriorities } from "./ceo-welcome";

function createVentureFromOnboarding(state: FounderOnboardingState): VentureProject {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    ideaText: state.venture.idea,
    name: state.venture.name,
    description: state.venture.idea,
    category: state.market.category,
    targetAudience: state.market.targetAudience,
    status: "intelligence",
    createdAt: now,
    updatedAt: now,
    intelligenceReport: null,
    analysis: null,
    founderAdvisor: null,
    sections: [],
    discoveryAnswers: null,
    discoveryContext: null,
  };
}

export function getJourneyEntryRoute(): string {
  if (isFounderOnboardingComplete()) return "/workspace";
  return "/onboarding";
}

export function getPostOnboardingRoute(): string {
  return "/workspace";
}

export function getPostWorkspaceRoute(): string {
  return "/os";
}

export async function syncProfileFromOnboarding(state: FounderOnboardingState): Promise<void> {
  const session = readSession();
  if (!session || !state.profile.name.trim()) return;
  await updateProfile(session.userId, { name: state.profile.name });
}

export function finalizeFounderJourney(
  state?: FounderOnboardingState
): FounderJourneyCompletionResult {
  const onboarding = state ?? getFounderOnboardingState();

  const venture = createVentureFromOnboarding(onboarding);
  saveVenture(venture);

  const ctx = getActiveWorkspaceContext();
  let workspaceId: string | null = null;
  if (ctx) {
    linkVentureToWorkspace(ctx.workspaceId, venture.id);
    workspaceId = ctx.workspaceId;
    updateUserPreferences(ctx.userId, {
      locale: "es",
    });
  }

  seedInitialTimeline(venture.id, onboarding);
  seedInitialKnowledge(venture.id, onboarding);
  seedInitialMemory(venture, onboarding);
  setJourneyVenture(venture.id);

  completeFounderOnboarding(venture.id);
  markMilestoneComplete("onboarding");
  markMilestoneComplete("register");
  markMilestoneComplete("venture-created");

  return {
    ventureId: venture.id,
    workspaceId,
    nextRoute: getPostOnboardingRoute(),
  };
}

export function prepareCeoBriefingStep(state: FounderOnboardingState): FounderOnboardingState {
  const priorities = buildCeoBriefingPriorities(state);
  return {
    ...state,
    ceoBriefing: { ...state.ceoBriefing, priorities },
  };
}

export function markJourneyMilestoneFromPath(pathname: string): void {
  if (pathname.startsWith("/register")) markMilestoneComplete("register");
  if (pathname.startsWith("/onboarding")) markMilestoneComplete("onboarding");
  if (pathname.startsWith("/workspace")) markMilestoneComplete("workspace");
  if (pathname.startsWith("/os/ceo") || pathname === "/ceo") markMilestoneComplete("ceo");
  if (pathname.startsWith("/organization")) markMilestoneComplete("organization");
  if (pathname.startsWith("/live")) markMilestoneComplete("live");
  if (pathname.startsWith("/venture-factory")) markMilestoneComplete("venture-factory");
}
