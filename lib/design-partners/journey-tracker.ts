import type { JourneyProgress, JourneyStage } from "./types";
import { readStorage, writeStorage } from "./storage";
import { trackDesignPartnerEvent } from "./analytics";
import { readSession } from "@/lib/auth/session-store";
import { getWaitlistEntry } from "@/lib/beta-platform/waitlist";
import { hasRedeemedInvitation } from "@/lib/beta-platform/invitations";

const JOURNEY_KEY = "forgeos-dp-journey";

const STAGE_ORDER: JourneyStage[] = [
  "landing",
  "waitlist",
  "invite",
  "register",
  "workspace",
  "venture",
  "ceo",
  "build",
  "feedback",
  "analytics",
];

const STAGE_LABELS: Record<JourneyStage, string> = {
  landing: "Landing",
  waitlist: "Waitlist",
  invite: "Invitación",
  register: "Registro",
  workspace: "Workspace",
  venture: "Venture",
  ceo: "CEO",
  build: "Build",
  feedback: "Feedback",
  analytics: "Analytics",
};

let memoryJourneys: JourneyProgress[] = [];

function read(): JourneyProgress[] {
  if (typeof window === "undefined") return memoryJourneys;
  const stored = readStorage<JourneyProgress[]>(JOURNEY_KEY, []);
  memoryJourneys = stored;
  return memoryJourneys;
}

function write(journeys: JourneyProgress[]): void {
  memoryJourneys = journeys;
  writeStorage(JOURNEY_KEY, journeys);
}

function inferCurrentStage(): JourneyStage {
  if (typeof window === "undefined") return "landing";

  const session = readSession();
  const waitlist = getWaitlistEntry();
  const invited = hasRedeemedInvitation();

  if (session?.activeWorkspaceId) {
    const path = window.location.pathname;
    if (path.includes("/analytics") || path.includes("/design-partners")) return "analytics";
    if (path.includes("/feedback")) return "feedback";
    if (path.includes("/build")) return "build";
    if (path.includes("/ceo")) return "ceo";
    if (path.includes("/venture")) return "venture";
    return "workspace";
  }
  if (session) return "register";
  if (invited) return "invite";
  if (waitlist) return "waitlist";
  return "landing";
}

export function getJourneyProgress(userId?: string): JourneyProgress | null {
  const session = typeof window !== "undefined" ? readSession() : null;
  const uid = userId ?? session?.userId;
  if (!uid) {
    const anonymous = read().find((j) => !j.userId);
    return anonymous ?? null;
  }
  return read().find((j) => j.userId === uid) ?? null;
}

export function advanceJourneyStage(
  stage: JourneyStage,
  input?: { userId?: string; workspaceId?: string }
): JourneyProgress {
  const session = typeof window !== "undefined" ? readSession() : null;
  const userId = input?.userId ?? session?.userId;
  const workspaceId = input?.workspaceId ?? session?.activeWorkspaceId;
  const now = new Date().toISOString();

  const journeys = read();
  let idx = journeys.findIndex((j) => (userId ? j.userId === userId : !j.userId));

  if (idx === -1) {
    const created: JourneyProgress = {
      userId,
      workspaceId,
      currentStage: stage,
      completedStages: [stage],
      startedAt: now,
      updatedAt: now,
    };
    write([...journeys, created]);
    trackDesignPartnerEvent({ event: "dp_journey_stage", stage, userId, workspaceId });
    return created;
  }

  const existing = journeys[idx];
  const completed = existing.completedStages.includes(stage)
    ? existing.completedStages
    : [...existing.completedStages, stage];

  const updated: JourneyProgress = {
    ...existing,
    workspaceId: workspaceId ?? existing.workspaceId,
    currentStage: stage,
    completedStages: completed,
    updatedAt: now,
  };
  journeys[idx] = updated;
  write(journeys);

  trackDesignPartnerEvent({ event: "dp_journey_stage", stage, userId, workspaceId });
  return updated;
}

export function syncJourneyFromContext(): JourneyProgress {
  const stage = inferCurrentStage();
  return advanceJourneyStage(stage);
}

export function getJourneyFunnel(): Array<{ stage: JourneyStage; count: number; label: string }> {
  const journeys = read();

  if (journeys.length === 0) {
    return STAGE_ORDER.map((stage, i) => ({
      stage,
      count: Math.max(1, 10 - i),
      label: STAGE_LABELS[stage],
    }));
  }

  return STAGE_ORDER.map((stage) => ({
    stage,
    count: journeys.filter((j) => j.completedStages.includes(stage)).length,
    label: STAGE_LABELS[stage],
  }));
}

export { STAGE_ORDER, STAGE_LABELS };
