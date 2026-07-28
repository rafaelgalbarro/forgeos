/**
 * Knowledge evolution wrapper — extends knowledge metadata without modifying core catalog.
 * Prepares versioning, categories, priority, origin, and validity for future growth.
 */

import type { KnowledgeEntryBase } from "@/lib/knowledge";
import { STORAGE_KEYS } from "./memory/types";
import { readStorage, writeStorage } from "./memory/storage";

export type KnowledgeOrigin = "catalog" | "venture" | "learning" | "manual";

export interface EvolvedKnowledgeMeta {
  entryId: string;
  domain: string;
  version: string;
  category: string;
  priority: "critical" | "high" | "medium" | "low";
  origin: KnowledgeOrigin;
  validFrom: string;
  validUntil?: string;
  ventureIds: string[];
  tags: string[];
  notes?: string;
  evolvedAt: string;
}

function readEvolutionMap(): Record<string, EvolvedKnowledgeMeta> {
  return readStorage<Record<string, EvolvedKnowledgeMeta>>(
    STORAGE_KEYS.knowledgeEvolution,
    {}
  );
}

export function wrapKnowledgeEntry(
  entry: KnowledgeEntryBase,
  overrides?: Partial<Pick<EvolvedKnowledgeMeta, "priority" | "origin" | "ventureIds" | "category" | "notes">>
): EvolvedKnowledgeMeta {
  const meta: EvolvedKnowledgeMeta = {
    entryId: entry.id,
    domain: entry.domain,
    version: entry.version,
    category: overrides?.category ?? entry.domain,
    priority: overrides?.priority ?? "medium",
    origin: overrides?.origin ?? "catalog",
    validFrom: entry.createdAt,
    validUntil: undefined,
    ventureIds: overrides?.ventureIds ?? [],
    tags: entry.tags,
    notes: overrides?.notes,
    evolvedAt: new Date().toISOString(),
  };
  const map = readEvolutionMap();
  map[entry.id] = meta;
  writeStorage(STORAGE_KEYS.knowledgeEvolution, map);
  return meta;
}

export function getEvolvedKnowledgeMeta(entryId: string): EvolvedKnowledgeMeta | undefined {
  return readEvolutionMap()[entryId];
}

export function getAllEvolvedKnowledge(): EvolvedKnowledgeMeta[] {
  return Object.values(readEvolutionMap());
}

export function invalidateKnowledge(entryId: string, validUntil?: string): EvolvedKnowledgeMeta | undefined {
  const map = readEvolutionMap();
  const existing = map[entryId];
  if (!existing) return undefined;
  existing.validUntil = validUntil ?? new Date().toISOString();
  existing.evolvedAt = new Date().toISOString();
  map[entryId] = existing;
  writeStorage(STORAGE_KEYS.knowledgeEvolution, map);
  return existing;
}

export function isKnowledgeValid(meta: EvolvedKnowledgeMeta): boolean {
  if (!meta.validUntil) return true;
  return new Date(meta.validUntil) > new Date();
}

export function getKnowledgeByPriority(
  priority: EvolvedKnowledgeMeta["priority"]
): EvolvedKnowledgeMeta[] {
  return getAllEvolvedKnowledge().filter(
    (m) => m.priority === priority && isKnowledgeValid(m)
  );
}

export function linkKnowledgeToVenture(entryId: string, ventureId: string): void {
  const map = readEvolutionMap();
  const existing = map[entryId];
  if (!existing) return;
  if (!existing.ventureIds.includes(ventureId)) {
    existing.ventureIds.push(ventureId);
    existing.evolvedAt = new Date().toISOString();
    map[entryId] = existing;
    writeStorage(STORAGE_KEYS.knowledgeEvolution, map);
  }
}
