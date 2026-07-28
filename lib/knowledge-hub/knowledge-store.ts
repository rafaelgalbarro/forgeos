/** Venture Knowledge Hub — in-memory index per venture (Epic 7.5). */

import type { VentureProject } from "@/lib/domain/venture";
import { buildDocumentTree } from "./knowledge-tree";
import { buildAllVersions } from "./knowledge-versions";
import { buildKnowledgeRelations } from "./knowledge-relations";
import type { KnowledgeHubIndex } from "./types";

const indexStore = new Map<string, KnowledgeHubIndex>();

export function buildKnowledgeHubIndex(venture: VentureProject): KnowledgeHubIndex {
  const tree = buildDocumentTree(venture);
  const versions = buildAllVersions(venture, tree.nodes);
  const relations = buildKnowledgeRelations(tree);

  const index: KnowledgeHubIndex = {
    ventureId: venture.id,
    tree,
    versions,
    relations,
    builtAt: new Date().toISOString(),
  };

  indexStore.set(venture.id, index);
  return index;
}

export function getKnowledgeHubIndex(ventureId: string): KnowledgeHubIndex | undefined {
  return indexStore.get(ventureId);
}

export function getOrBuildKnowledgeHubIndex(venture: VentureProject): KnowledgeHubIndex {
  const cached = indexStore.get(venture.id);
  if (cached && cached.builtAt >= (venture.updatedAt ?? "")) {
    return cached;
  }
  return buildKnowledgeHubIndex(venture);
}

export function invalidateKnowledgeHubIndex(ventureId: string): void {
  indexStore.delete(ventureId);
}

export function clearKnowledgeHubStore(): void {
  indexStore.clear();
}

export function listIndexedVentureIds(): string[] {
  return [...indexStore.keys()];
}
