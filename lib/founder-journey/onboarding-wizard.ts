/** Program 3000 Sprint 2 — 6-step founder onboarding wizard (FHIS). */

import type {
  FounderOnboardingState,
  FounderOnboardingStep,
  FounderOnboardingStepId,
} from "./types";

const STORAGE_KEY = "forgeos-founder-onboarding";

export const FOUNDER_ONBOARDING_STEPS: FounderOnboardingStep[] = [
  {
    id: "perfil",
    title: "Perfil",
    description: "Cuéntanos quién eres para personalizar tu experiencia.",
  },
  {
    id: "empresa",
    title: "Empresa",
    description: "Contexto de tu organización y equipo.",
  },
  {
    id: "objetivos",
    title: "Objetivos",
    description: "¿Qué quieres lograr con ForgeOS?",
  },
  {
    id: "mercado",
    title: "Mercado",
    description: "Define tu audiencia y panorama competitivo.",
  },
  {
    id: "primera-venture",
    title: "Primera Venture",
    description: "Articula la idea que quieres construir.",
  },
  {
    id: "ceo-briefing",
    title: "CEO Briefing",
    description: "Revisa prioridades ejecutivas antes de entrar al OS.",
  },
];

const STEP_ORDER: FounderOnboardingStepId[] = FOUNDER_ONBOARDING_STEPS.map((s) => s.id);

const DEFAULT_STATE: FounderOnboardingState = {
  currentStep: "perfil",
  completedSteps: [],
  profile: { name: "", role: "founder", bio: "" },
  company: { companyName: "", industry: "", teamSize: "1-5" },
  goals: [],
  market: {
    targetAudience: "",
    marketSize: "",
    competitors: "",
    category: "saas",
  },
  venture: { name: "", idea: "", priority: "medium" },
  ceoBriefing: { priorities: [], acknowledged: false },
  startedAt: new Date().toISOString(),
};

let memoryState: FounderOnboardingState = { ...DEFAULT_STATE };

function read(): FounderOnboardingState {
  if (typeof window === "undefined") return memoryState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) memoryState = { ...DEFAULT_STATE, ...JSON.parse(raw) } as FounderOnboardingState;
  } catch {
    /* keep memory */
  }
  return memoryState;
}

function write(state: FounderOnboardingState): void {
  memoryState = state;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function getFounderOnboardingState(): FounderOnboardingState {
  return read();
}

export function isFounderOnboardingComplete(): boolean {
  const state = read();
  return STEP_ORDER.every((id) => state.completedSteps.includes(id));
}

export function getFounderStepIndex(stepId: FounderOnboardingStepId): number {
  return STEP_ORDER.indexOf(stepId);
}

export function getNextFounderStep(stepId: FounderOnboardingStepId): FounderOnboardingStepId | null {
  const idx = getFounderStepIndex(stepId);
  return idx >= 0 && idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

export function getPrevFounderStep(stepId: FounderOnboardingStepId): FounderOnboardingStepId | null {
  const idx = getFounderStepIndex(stepId);
  return idx > 0 ? STEP_ORDER[idx - 1] : null;
}

export function goToFounderStep(stepId: FounderOnboardingStepId): FounderOnboardingState {
  const updated = { ...read(), currentStep: stepId };
  write(updated);
  return updated;
}

export function advanceFounderOnboarding(
  patch: Partial<
    Pick<
      FounderOnboardingState,
      "profile" | "company" | "goals" | "market" | "venture" | "ceoBriefing"
    >
  >
): FounderOnboardingState {
  const state = read();
  const current = state.currentStep;
  const completed = state.completedSteps.includes(current)
    ? state.completedSteps
    : [...state.completedSteps, current];
  const next = getNextFounderStep(current) ?? current;
  const updated: FounderOnboardingState = {
    ...state,
    ...patch,
    profile: patch.profile ? { ...state.profile, ...patch.profile } : state.profile,
    company: patch.company ? { ...state.company, ...patch.company } : state.company,
    goals: patch.goals ?? state.goals,
    market: patch.market ? { ...state.market, ...patch.market } : state.market,
    venture: patch.venture ? { ...state.venture, ...patch.venture } : state.venture,
    ceoBriefing: patch.ceoBriefing
      ? { ...state.ceoBriefing, ...patch.ceoBriefing }
      : state.ceoBriefing,
    completedSteps: completed,
    currentStep: next,
  };
  write(updated);
  return updated;
}

export function completeFounderOnboarding(ventureId?: string): FounderOnboardingState {
  const state = read();
  const updated: FounderOnboardingState = {
    ...state,
    completedSteps: [...new Set([...state.completedSteps, ...STEP_ORDER])],
    currentStep: "ceo-briefing",
    completedAt: new Date().toISOString(),
    ventureId,
  };
  write(updated);
  return updated;
}

export function resetFounderOnboarding(): void {
  memoryState = { ...DEFAULT_STATE, startedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function validateFounderStep(stepId: FounderOnboardingStepId, state: FounderOnboardingState): string | null {
  switch (stepId) {
    case "perfil":
      if (!state.profile.name.trim()) return "Indica tu nombre.";
      return null;
    case "empresa":
      if (!state.company.companyName.trim()) return "Indica el nombre de tu empresa.";
      return null;
    case "objetivos":
      if (state.goals.length === 0) return "Añade al menos un objetivo.";
      return null;
    case "mercado":
      if (!state.market.targetAudience.trim()) return "Describe tu audiencia objetivo.";
      return null;
    case "primera-venture":
      if (!state.venture.name.trim()) return "Indica un nombre para la venture.";
      if (state.venture.idea.trim().length < 20) return "Describe tu idea con al menos 20 caracteres.";
      return null;
    case "ceo-briefing":
      if (!state.ceoBriefing.acknowledged) return "Confirma que has revisado el briefing del CEO.";
      return null;
    default:
      return null;
  }
}
