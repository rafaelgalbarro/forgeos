/** Program 7000 — Product tour state machine */

import { FORGEOS_LAUNCH_STORAGE_KEYS } from "./config";
import type { ProductTourState, ProductTourStep, ProductTourStepId } from "./types";

export const PRODUCT_TOUR_STEPS: ProductTourStep[] = [
  {
    id: "welcome",
    title: "Bienvenido a ForgeOS 1.0",
    description: "El sistema operativo para crear ventures con IA. Este tour te guía por las áreas clave.",
    highlight: "/launch",
  },
  {
    id: "venture-factory",
    title: "Venture Factory",
    description: "Pipeline completo desde idea hasta launch: brand, landing y go-to-market.",
    highlight: "/venture-factory",
  },
  {
    id: "founder-journey",
    title: "Founder Journey",
    description: "Recorrido guiado por fases con milestones y recomendaciones de IA.",
    highlight: "/founder-journey",
  },
  {
    id: "live-ops",
    title: "Live AI Operations",
    description: "Centro de mando en tiempo real para operaciones de tu venture.",
    highlight: "/live",
  },
  {
    id: "pricing",
    title: "Planes comerciales",
    description: "Starter, Pro, Business y Enterprise — elige según tu etapa.",
    highlight: "/pricing",
  },
  {
    id: "complete",
    title: "¡Listo para empezar!",
    description: "Entra al workspace o solicita acceso beta para construir tu primera venture.",
    highlight: "/os",
  },
];

const STEP_ORDER: ProductTourStepId[] = PRODUCT_TOUR_STEPS.map((s) => s.id);

export function getProductTourStep(stepId: ProductTourStepId): ProductTourStep | undefined {
  return PRODUCT_TOUR_STEPS.find((s) => s.id === stepId);
}

export function getInitialTourState(): ProductTourState {
  return { currentStep: "welcome", completedSteps: [] };
}

export function advanceTourStep(state: ProductTourState): ProductTourState {
  const idx = STEP_ORDER.indexOf(state.currentStep);
  const completed = state.completedSteps.includes(state.currentStep)
    ? state.completedSteps
    : [...state.completedSteps, state.currentStep];
  if (idx >= STEP_ORDER.length - 1) {
    return { ...state, completedSteps: completed, completedAt: new Date().toISOString() };
  }
  return { ...state, currentStep: STEP_ORDER[idx + 1], completedSteps: completed };
}

export function retreatTourStep(state: ProductTourState): ProductTourState {
  const idx = STEP_ORDER.indexOf(state.currentStep);
  if (idx <= 0) return state;
  return { ...state, currentStep: STEP_ORDER[idx - 1] };
}

export function loadTourState(): ProductTourState {
  if (typeof window === "undefined") return getInitialTourState();
  try {
    const raw = localStorage.getItem(FORGEOS_LAUNCH_STORAGE_KEYS.productTour);
    if (!raw) return getInitialTourState();
    return JSON.parse(raw) as ProductTourState;
  } catch {
    return getInitialTourState();
  }
}

export function saveTourState(state: ProductTourState): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(FORGEOS_LAUNCH_STORAGE_KEYS.productTour, JSON.stringify(state));
}

export function resetTourState(): ProductTourState {
  const initial = getInitialTourState();
  saveTourState(initial);
  return initial;
}

export function getTourProgress(state: ProductTourState): number {
  return Math.round((state.completedSteps.length / STEP_ORDER.length) * 100);
}
