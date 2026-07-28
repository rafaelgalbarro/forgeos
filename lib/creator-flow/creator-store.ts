import type { CreatorStepId, CreatorStoreState, CreatorVentureFlowState } from "./types";
import { CREATOR_STEPS } from "./creator-steps";

const STORAGE_KEY = "forgeos-creator-flow";

let memoryState: CreatorStoreState = {
  ventures: {},
  activeVentureId: null,
};

function readStore(): CreatorStoreState {
  if (typeof window === "undefined") return memoryState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) memoryState = JSON.parse(raw) as CreatorStoreState;
  } catch {
    /* keep memory */
  }
  return memoryState;
}

function writeStore(state: CreatorStoreState): void {
  memoryState = state;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

function defaultVentureState(ventureId: string): CreatorVentureFlowState {
  return {
    ventureId,
    currentStepId: "idea",
    completedStepIds: [],
    lastUpdatedAt: new Date().toISOString(),
  };
}

export function getCreatorStoreState(): CreatorStoreState {
  return readStore();
}

export function getCreatorVentureState(ventureId: string): CreatorVentureFlowState {
  const store = readStore();
  return store.ventures[ventureId] ?? defaultVentureState(ventureId);
}

export function setCreatorVenture(ventureId: string): void {
  const store = readStore();
  const ventures = { ...store.ventures };
  if (!ventures[ventureId]) {
    ventures[ventureId] = defaultVentureState(ventureId);
  }
  writeStore({
    ventures,
    activeVentureId: ventureId,
  });
}

export function markStepComplete(ventureId: string, stepId: CreatorStepId): CreatorVentureFlowState {
  const store = readStore();
  const current = store.ventures[ventureId] ?? defaultVentureState(ventureId);
  const completedStepIds = current.completedStepIds.includes(stepId)
    ? current.completedStepIds
    : [...current.completedStepIds, stepId];

  const nextIdx = CREATOR_STEPS.findIndex((s) => s.id === stepId) + 1;
  const nextStep = CREATOR_STEPS[nextIdx]?.id ?? stepId;

  const updated: CreatorVentureFlowState = {
    ...current,
    completedStepIds,
    currentStepId: nextIdx < CREATOR_STEPS.length ? nextStep : stepId,
    lastUpdatedAt: new Date().toISOString(),
  };

  writeStore({
    ...store,
    ventures: { ...store.ventures, [ventureId]: updated },
    activeVentureId: ventureId,
  });

  return updated;
}

export function setCreatorCurrentStep(ventureId: string, stepId: CreatorStepId): void {
  const store = readStore();
  const current = store.ventures[ventureId] ?? defaultVentureState(ventureId);
  writeStore({
    ...store,
    ventures: {
      ...store.ventures,
      [ventureId]: { ...current, currentStepId: stepId, lastUpdatedAt: new Date().toISOString() },
    },
    activeVentureId: ventureId,
  });
}

export function resolveActiveVentureId(preferredId?: string | null): string | null {
  if (preferredId) return preferredId;
  const store = readStore();
  return store.activeVentureId;
}
