/** Program 3000 Sprint 2 — founder journey progress tracking. */

import type {
  FounderJourneyMilestone,
  FounderJourneyMilestoneId,
  FounderJourneyProgress,
} from "./types";
import { isFounderOnboardingComplete } from "./onboarding-wizard";

const STORAGE_KEY = "forgeos-founder-journey-progress";

export const FOUNDER_JOURNEY_MILESTONES: FounderJourneyMilestone[] = [
  {
    id: "landing",
    label: "Landing",
    href: "/landing",
    description: "Descubre ForgeOS",
  },
  {
    id: "register",
    label: "Registro",
    href: "/register",
    description: "Crea tu cuenta y workspace",
  },
  {
    id: "onboarding",
    label: "Onboarding",
    href: "/onboarding",
    description: "Configura perfil, empresa y primera venture",
  },
  {
    id: "workspace",
    label: "Workspace",
    href: "/workspace",
    description: "Tu centro de operaciones",
  },
  {
    id: "venture-created",
    label: "Venture",
    href: "/founder-journey",
    description: "Primera venture creada",
  },
  {
    id: "ceo",
    label: "CEO",
    href: "/os/ceo",
    description: "Briefing ejecutivo",
  },
  {
    id: "organization",
    label: "Organización",
    href: "/organization",
    description: "Equipo autónomo",
  },
  {
    id: "live",
    label: "Live",
    href: "/live",
    description: "Operaciones en tiempo real",
  },
  {
    id: "venture-factory",
    label: "Venture Factory",
    href: "/venture-factory",
    description: "Pipeline de construcción",
  },
];

let memoryCompleted: FounderJourneyMilestoneId[] = ["landing"];

function readCompleted(): FounderJourneyMilestoneId[] {
  if (typeof window === "undefined") return memoryCompleted;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) memoryCompleted = JSON.parse(raw) as FounderJourneyMilestoneId[];
  } catch {
    /* keep memory */
  }
  return memoryCompleted;
}

function writeCompleted(ids: FounderJourneyMilestoneId[]): void {
  memoryCompleted = ids;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
}

export function getCompletedMilestones(): FounderJourneyMilestoneId[] {
  return readCompleted();
}

export function markMilestoneComplete(id: FounderJourneyMilestoneId): void {
  const current = readCompleted();
  if (!current.includes(id)) {
    writeCompleted([...current, id]);
  }
}

export function computeJourneyProgress(): FounderJourneyProgress {
  const completed = new Set(readCompleted());
  if (isFounderOnboardingComplete()) completed.add("onboarding");

  const milestones = FOUNDER_JOURNEY_MILESTONES;
  const completedIds = milestones.filter((m) => completed.has(m.id)).map((m) => m.id);
  const current =
    milestones.find((m) => !completed.has(m.id)) ?? milestones[milestones.length - 1];
  const percentComplete = Math.round((completedIds.length / milestones.length) * 100);

  return {
    milestones,
    completedIds,
    currentId: current.id,
    percentComplete,
  };
}

export function getMilestoneById(id: FounderJourneyMilestoneId): FounderJourneyMilestone | undefined {
  return FOUNDER_JOURNEY_MILESTONES.find((m) => m.id === id);
}
