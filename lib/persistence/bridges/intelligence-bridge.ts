/** Intelligence bridge — wires memory/knowledge/decisions/timeline to repositories. */

import type { CeoMemory, Decision, VentureMemoryRecord } from "@/lib/intelligence-layer/types";
import type { KnowledgeHubIndex } from "@/lib/knowledge-hub/types";
import type { BuildContext } from "@/lib/build-platform/build-context/types";
import type { BuildDna } from "@/lib/build-platform/build-dna/types";
import type { TimelineEvent } from "@/lib/venture-timeline/types";
import {
  getBuildContextRepository,
  getBuildDnaRepository,
  getCeoDecisionRepository,
  getKnowledgeHubRepository,
  getMemoryRepository,
  getTimelineRepository,
} from "../index";
import { scheduleAutosave } from "../autosave/autosave";

const memoryRepo = () => getMemoryRepository();
const decisionRepo = () => getCeoDecisionRepository();
const timelineRepo = () => getTimelineRepository();
const buildContextRepo = () => getBuildContextRepository();
const buildDnaRepo = () => getBuildDnaRepository();
const knowledgeHubRepo = () => getKnowledgeHubRepository();

// ── Memory ───────────────────────────────────────────────────────

export function getVentureMemory(ventureId: string): VentureMemoryRecord | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("forgeos-intelligence-venture-memory");
    const map = raw ? (JSON.parse(raw) as Record<string, VentureMemoryRecord>) : {};
    return map[ventureId];
  } catch {
    return undefined;
  }
}

export function saveVentureMemory(record: VentureMemoryRecord): void {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("forgeos-intelligence-venture-memory");
      const map = raw ? (JSON.parse(raw) as Record<string, VentureMemoryRecord>) : {};
      map[record.ventureId] = { ...record, syncedAt: new Date().toISOString() };
      localStorage.setItem("forgeos-intelligence-venture-memory", JSON.stringify(map));
    } catch {
      // noop
    }
  }
  void memoryRepo().save(record);
  scheduleAutosave(`memory:${record.ventureId}`, async () => {
    await memoryRepo().save(record);
  });
}

// ── Decisions ────────────────────────────────────────────────────

export function getDecisions(): Decision[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("forgeos-intelligence-decisions");
    return raw ? (JSON.parse(raw) as Decision[]) : [];
  } catch {
    return [];
  }
}

export function saveDecision(decision: Decision): void {
  const all = getDecisions();
  const i = all.findIndex((d) => d.id === decision.id);
  if (i >= 0) all[i] = decision;
  else all.push(decision);
  if (typeof window !== "undefined") {
    localStorage.setItem("forgeos-intelligence-decisions", JSON.stringify(all));
  }
  void decisionRepo().save(decision);
  scheduleAutosave("decisions", async () => {
    await decisionRepo().save(decision);
  });
}

export function getDecisionsByVenture(ventureId: string): Decision[] {
  return getDecisions().filter((d) => d.ventureId === ventureId);
}

// ── CEO Memory ───────────────────────────────────────────────────

export function getCeoMemory(): CeoMemory {
  if (typeof window === "undefined") {
    return { briefings: [], recommendations: [], priorities: [], results: [], updatedAt: new Date().toISOString() };
  }
  try {
    const raw = localStorage.getItem("forgeos-intelligence-ceo-memory");
    return raw
      ? (JSON.parse(raw) as CeoMemory)
      : { briefings: [], recommendations: [], priorities: [], results: [], updatedAt: new Date().toISOString() };
  } catch {
    return { briefings: [], recommendations: [], priorities: [], results: [], updatedAt: new Date().toISOString() };
  }
}

export function saveCeoMemory(memory: CeoMemory): void {
  const updated = { ...memory, updatedAt: new Date().toISOString() };
  if (typeof window !== "undefined") {
    localStorage.setItem("forgeos-intelligence-ceo-memory", JSON.stringify(updated));
  }
  void decisionRepo().saveCeoMemory(updated);
  scheduleAutosave("ceo-memory", async () => {
    await decisionRepo().saveCeoMemory(updated);
  });
}

// ── Build Context (persisted via repo, with in-memory cache) ─────

const buildContextCache = new Map<string, BuildContext>();

export function getBuildContext(ventureId: string): BuildContext | undefined {
  if (buildContextCache.has(ventureId)) {
    return buildContextCache.get(ventureId);
  }
  void buildContextRepo().getByVenture(ventureId).then((ctx) => {
    if (ctx) buildContextCache.set(ventureId, ctx);
  });
  return buildContextCache.get(ventureId);
}

export function setBuildContext(context: BuildContext): BuildContext {
  buildContextCache.set(context.meta.ventureId, context);
  void buildContextRepo().save(context);
  scheduleAutosave(`build-context:${context.meta.ventureId}`, async () => {
    await buildContextRepo().save(context);
  });
  return context;
}

export async function loadBuildContext(ventureId: string): Promise<BuildContext | null> {
  const ctx = await buildContextRepo().getByVenture(ventureId);
  if (ctx) buildContextCache.set(ventureId, ctx);
  return ctx;
}

// ── Build DNA ────────────────────────────────────────────────────

const buildDnaCache = new Map<string, BuildDna>();

export function getBuildDna(ventureId: string): BuildDna | undefined {
  return buildDnaCache.get(ventureId);
}

export function setBuildDna(dna: BuildDna): BuildDna {
  buildDnaCache.set(dna.meta.ventureId, dna);
  void buildDnaRepo().save(dna);
  scheduleAutosave(`build-dna:${dna.meta.ventureId}`, async () => {
    await buildDnaRepo().save(dna);
  });
  return dna;
}

export async function loadBuildDna(ventureId: string): Promise<BuildDna | null> {
  const dna = await buildDnaRepo().getByVenture(ventureId);
  if (dna) buildDnaCache.set(ventureId, dna);
  return dna;
}

// ── Timeline ─────────────────────────────────────────────────────

export function getTimelineEvents(ventureId: string): TimelineEvent[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem("forgeos-persist-timeline");
    const map = raw ? (JSON.parse(raw) as Record<string, TimelineEvent[]>) : {};
    return map[ventureId] ?? [];
  } catch {
    return [];
  }
}

export function saveTimelineEvents(
  ventureId: string,
  events: TimelineEvent[]
): void {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("forgeos-persist-timeline");
      const map = raw ? (JSON.parse(raw) as Record<string, TimelineEvent[]>) : {};
      map[ventureId] = events;
      localStorage.setItem("forgeos-persist-timeline", JSON.stringify(map));
    } catch {
      // noop
    }
  }
  void timelineRepo().saveEvents(ventureId, events);
}

// ── Knowledge Hub ────────────────────────────────────────────────

export function getKnowledgeHubIndex(
  ventureId: string
): KnowledgeHubIndex | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = localStorage.getItem("forgeos-persist-knowledge-hub");
    const map = raw ? (JSON.parse(raw) as Record<string, KnowledgeHubIndex>) : {};
    return map[ventureId];
  } catch {
    return undefined;
  }
}

export function saveKnowledgeHubIndex(index: KnowledgeHubIndex): void {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem("forgeos-persist-knowledge-hub");
      const map = raw ? (JSON.parse(raw) as Record<string, KnowledgeHubIndex>) : {};
      map[index.ventureId] = index;
      localStorage.setItem("forgeos-persist-knowledge-hub", JSON.stringify(map));
    } catch {
      // noop
    }
  }
  void knowledgeHubRepo().save(index);
  scheduleAutosave(`knowledge-hub:${index.ventureId}`, async () => {
    await knowledgeHubRepo().save(index);
  });
}
