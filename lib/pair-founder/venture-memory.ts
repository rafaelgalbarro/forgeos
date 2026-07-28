/** Long-term venture memory — localStorage per missionId + Founder Zero adapter. */

import type { Mission } from "@/lib/mission-control/types";
import type { VentureMemory } from "./types";
import { syncFounderMemoryHint, mergeFounderHints } from "./adapters/founder-memory-adapter";

const STORAGE_PREFIX = "forgeos-pair-founder-memory-";

function storageKey(missionId: string): string {
  return `${STORAGE_PREFIX}${missionId}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function createEmptyMemory(missionId: string): VentureMemory {
  return {
    missionId,
    ventureSummary: "",
    keyFacts: [],
    priorDecisions: [],
    strategyNotes: [],
    lastUpdated: new Date().toISOString(),
    turnCount: 0,
  };
}

export function readVentureMemory(missionId: string): VentureMemory {
  if (!isBrowser()) return createEmptyMemory(missionId);
  try {
    const raw = localStorage.getItem(storageKey(missionId));
    if (!raw) return createEmptyMemory(missionId);
    return JSON.parse(raw) as VentureMemory;
  } catch {
    return createEmptyMemory(missionId);
  }
}

export function writeVentureMemory(memory: VentureMemory): void {
  if (!isBrowser()) return;
  localStorage.setItem(storageKey(memory.missionId), JSON.stringify({ ...memory, lastUpdated: new Date().toISOString() }));
}

export async function hydrateVentureMemory(missionId: string): Promise<VentureMemory> {
  let memory = readVentureMemory(missionId);
  const hint = await syncFounderMemoryHint(missionId);
  if (hint.synced && hint.factCount > 0) {
    memory = mergeFounderHints(memory, [`Founder Zero: ${hint.factCount} entradas históricas vinculadas`]);
  }
  return memory;
}

export function updateMemoryFromMission(memory: VentureMemory, mission: Mission, userInput?: string): VentureMemory {
  const turnCount = memory.turnCount + 1;
  const parts: string[] = [];

  if (mission.idea) parts.push(`Idea: ${mission.idea}`);
  if (mission.intention) parts.push(`Intención: ${mission.intention}`);
  parts.push(`Fase: ${mission.phase}`);

  const ventureSummary = parts.join(" · ");

  const keyFacts = [...memory.keyFacts];
  if (userInput && userInput.length > 10) {
    keyFacts.push(userInput.slice(0, 120));
  }
  if (mission.factoryRoute) keyFacts.push(`Ruta: ${mission.factoryRoute}`);

  const priorDecisions = [...memory.priorDecisions];
  for (const d of mission.pendingDecisions) {
    if (d.resolved && d.selectedOption) {
      const entry = `${d.title} → ${d.selectedOption}`;
      if (!priorDecisions.includes(entry)) priorDecisions.push(entry);
    }
  }

  const strategyNotes = [...memory.strategyNotes];
  if (mission.status.recommendations.length) {
    strategyNotes.push(mission.status.recommendations[0]);
  }

  return {
    ...memory,
    ventureSummary,
    keyFacts: [...new Set(keyFacts)].slice(-15),
    priorDecisions: [...new Set(priorDecisions)].slice(-20),
    strategyNotes: [...new Set(strategyNotes)].slice(-10),
    turnCount,
    lastUpdated: new Date().toISOString(),
  };
}

export function appendStrategyNote(memory: VentureMemory, note: string): VentureMemory {
  const strategyNotes = [...memory.strategyNotes];
  if (!strategyNotes.includes(note)) strategyNotes.push(note);
  return { ...memory, strategyNotes: strategyNotes.slice(-10) };
}

export function memoryDelta(prev: VentureMemory, next: VentureMemory): string {
  const changes: string[] = [];
  if (prev.ventureSummary !== next.ventureSummary) changes.push("Contexto de venture actualizado");
  if (next.keyFacts.length > prev.keyFacts.length) changes.push(`${next.keyFacts.length - prev.keyFacts.length} hecho(s) nuevo(s)`);
  if (next.priorDecisions.length > prev.priorDecisions.length) {
    changes.push(`Decisión registrada: ${next.priorDecisions[next.priorDecisions.length - 1]}`);
  }
  if (next.turnCount > prev.turnCount) changes.push(`Turno ${next.turnCount}`);
  return changes.length ? changes.join("; ") : "Sin cambios significativos desde el último turno";
}
