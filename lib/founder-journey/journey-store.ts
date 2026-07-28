import type { VentureProject } from "@/lib/domain/venture";
import { VANDL_VENTURE, VANDL_VENTURE_ID, resolveVandlVenture } from "@/lib/fixtures/vandl-venture";
import { getVentureById, getVentures } from "@/lib/store/ventures";
import type { JourneyPhaseId, JourneyStoreState } from "./types";

const STORAGE_KEY = "forgeos-founder-journey";

let memoryState: JourneyStoreState = {
  ventureId: null,
  selectedPhaseId: null,
  lastViewedAt: null,
};

function readStore(): JourneyStoreState {
  if (typeof window === "undefined") return memoryState;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) memoryState = JSON.parse(raw) as JourneyStoreState;
  } catch {
    /* keep memory */
  }
  return memoryState;
}

function writeStore(state: JourneyStoreState): void {
  memoryState = state;
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }
}

export function getJourneyStoreState(): JourneyStoreState {
  return readStore();
}

export function setSelectedPhase(phaseId: JourneyPhaseId | null): void {
  const state = readStore();
  writeStore({
    ...state,
    selectedPhaseId: phaseId,
    lastViewedAt: new Date().toISOString(),
  });
}

export function setJourneyVenture(ventureId: string): void {
  writeStore({
    ventureId,
    selectedPhaseId: null,
    lastViewedAt: new Date().toISOString(),
  });
}

export function resolveJourneyVenture(ventureId?: string | null): VentureProject {
  if (ventureId) {
    const fixture = resolveVandlVenture(ventureId);
    if (fixture) return fixture;
    const found = getVentureById(ventureId);
    if (found) return found;
  }

  const vandl = getVentureById(VANDL_VENTURE_ID);
  if (vandl) return vandl;

  const store = readStore();
  if (store.ventureId) {
    const stored = resolveVandlVenture(store.ventureId) ?? getVentureById(store.ventureId);
    if (stored) return stored;
  }

  const ventures = getVentures();
  if (ventures.length > 0) return ventures[0];

  return VANDL_VENTURE;
}
