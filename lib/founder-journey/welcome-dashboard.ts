/** Program 3000 Sprint 2 — Welcome Dashboard data builder. */

import { readSession } from "@/lib/auth/session-store";
import { getActiveWorkspaceContext } from "@/lib/workspace";
import type { FounderOnboardingState, WelcomeDashboardData } from "./types";
import { getFounderOnboardingState } from "./onboarding-wizard";
import { computeJourneyProgress } from "./progress-tracker";

export function buildWelcomeDashboard(
  onboarding?: FounderOnboardingState
): WelcomeDashboardData {
  const state = onboarding ?? getFounderOnboardingState();
  const session = readSession();
  const ctx = getActiveWorkspaceContext();
  const progress = computeJourneyProgress();
  const name = state.profile.name || session?.name || "Fundador";

  const nextMilestone = progress.milestones.find((m) => m.id === progress.currentId);

  return {
    greeting: `Bienvenido, ${name}`,
    subtitle: ctx
      ? `Workspace activo: ${ctx.workspaceName} · ${progress.percentComplete}% del recorrido`
      : "Configura tu workspace para empezar",
    nextAction: {
      label: nextMilestone?.label ?? "Abrir ForgeOS",
      href: nextMilestone?.href ?? "/os",
      description: nextMilestone?.description ?? "Continúa tu recorrido fundador",
    },
    quickLinks: [
      { label: "ForgeOS", href: "/os" },
      { label: "Founder Journey", href: "/founder-journey" },
      { label: "Venture Factory", href: "/venture-factory" },
      { label: "CEO", href: "/os/ceo" },
    ],
    stats: [
      { label: "Progreso", value: `${progress.percentComplete}%` },
      { label: "Objetivos", value: String(state.goals.length) },
      { label: "Ventures", value: String(ctx?.ventureIds.length ?? 0) },
    ],
  };
}
