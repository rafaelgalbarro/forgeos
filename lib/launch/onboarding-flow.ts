import type { OnboardingState, OnboardingStep, OnboardingStepId } from "./types";

const STORAGE_KEY = "forgeos-onboarding";

export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: "welcome",
    title: "Bienvenido a ForgeOS",
    description: "Tu sistema operativo para crear ventures con IA.",
  },
  {
    id: "profile",
    title: "Tu perfil",
    description: "Cuéntanos quién eres para personalizar tu workspace.",
  },
  {
    id: "goals",
    title: "Tus objetivos",
    description: "¿Qué quieres construir primero?",
  },
  {
    id: "workspace",
    title: "Tu workspace",
    description: "Elige cómo empezar tu primera venture.",
  },
  {
    id: "complete",
    title: "Listo para forjar",
    description: "Entra a ForgeOS y crea tu primera venture demo.",
  },
];

const STEP_ORDER: OnboardingStepId[] = ONBOARDING_STEPS.map((s) => s.id);

const DEFAULT_STATE: OnboardingState = {
  currentStep: "welcome",
  completedSteps: [],
  profile: { name: "", role: "founder", company: "" },
  goals: [],
  venturePath: "venture-factory",
  startedAt: new Date().toISOString(),
};

let memoryState: OnboardingState = { ...DEFAULT_STATE };

function read(): OnboardingState {
  if (typeof window === "undefined") return memoryState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) memoryState = JSON.parse(raw) as OnboardingState;
  } catch {
    /* keep memory */
  }
  return memoryState;
}

function write(state: OnboardingState): void {
  memoryState = state;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function getOnboardingState(): OnboardingState {
  return read();
}

export function isOnboardingComplete(): boolean {
  const state = read();
  return state.completedSteps.includes("complete");
}

export function getStepIndex(stepId: OnboardingStepId): number {
  return STEP_ORDER.indexOf(stepId);
}

export function getNextStep(stepId: OnboardingStepId): OnboardingStepId | null {
  const idx = getStepIndex(stepId);
  return idx >= 0 && idx < STEP_ORDER.length - 1 ? STEP_ORDER[idx + 1] : null;
}

export function getPrevStep(stepId: OnboardingStepId): OnboardingStepId | null {
  const idx = getStepIndex(stepId);
  return idx > 0 ? STEP_ORDER[idx - 1] : null;
}

export function goToStep(stepId: OnboardingStepId): OnboardingState {
  const state = read();
  const updated = { ...state, currentStep: stepId };
  write(updated);
  return updated;
}

export function advanceOnboarding(
  patch: Partial<Pick<OnboardingState, "profile" | "goals" | "venturePath">>
): OnboardingState {
  const state = read();
  const current = state.currentStep;
  const completed = state.completedSteps.includes(current)
    ? state.completedSteps
    : [...state.completedSteps, current];
  const next = getNextStep(current) ?? current;
  const updated: OnboardingState = {
    ...state,
    ...patch,
    profile: patch.profile ? { ...state.profile, ...patch.profile } : state.profile,
    goals: patch.goals ?? state.goals,
    venturePath: patch.venturePath ?? state.venturePath,
    completedSteps: completed,
    currentStep: next,
    completedAt: next === "complete" ? new Date().toISOString() : state.completedAt,
  };
  write(updated);
  return updated;
}

export function completeOnboarding(): OnboardingState {
  const state = read();
  const updated: OnboardingState = {
    ...state,
    currentStep: "complete",
    completedSteps: [...new Set([...state.completedSteps, ...STEP_ORDER])],
    completedAt: new Date().toISOString(),
  };
  write(updated);
  return updated;
}

export function resetOnboarding(): void {
  memoryState = { ...DEFAULT_STATE, startedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}

export function getVentureEntryPath(state: OnboardingState): string {
  switch (state.venturePath) {
    case "founder-journey":
      return "/founder-journey";
    case "founder":
      return "/founder";
    default:
      return "/venture-factory";
  }
}
