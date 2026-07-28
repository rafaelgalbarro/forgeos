/** Venture Knowledge Hub — version history per node (Epic 7.5). */

import type { VentureProject } from "@/lib/domain/venture";
import { getBuildContextHistory } from "@/lib/build-platform/build-context";
import { getVentureMemory } from "@/lib/intelligence-layer/venture-memory";
import type { KnowledgeNode, KnowledgeVersion } from "./types";

function versionId(nodeId: string, version: number): string {
  return `kh-ver-${nodeId}-v${version}`;
}

export function buildVersionsForNode(
  venture: VentureProject,
  node: KnowledgeNode
): KnowledgeVersion[] {
  const versions: KnowledgeVersion[] = [];

  versions.push({
    id: versionId(node.id, 1),
    nodeId: node.id,
    version: 1,
    label: "Current",
    summary: node.summary,
    createdAt: venture.updatedAt ?? venture.createdAt,
    source: node.sourceModule,
  });

  if (venture.createdAt !== venture.updatedAt) {
    versions.push({
      id: versionId(node.id, 0),
      nodeId: node.id,
      version: 0,
      label: "Initial",
      summary: `Venture creado — ${venture.ideaText.slice(0, 120)}`,
      createdAt: venture.createdAt,
      source: "lib/store/ventures",
    });
  }

  if (node.id === "build-context") {
    const history = getBuildContextHistory(venture.id);
    history.slice(0, 5).forEach((entry) => {
      versions.push({
        id: `kh-bctx-${entry.id}`,
        nodeId: node.id,
        version: entry.version,
        label: entry.action,
        summary: entry.summary,
        createdAt: entry.createdAt,
        source: "lib/build-platform/build-context/context-history",
      });
    });
  }

  if (node.category === "memory") {
    const memory = getVentureMemory(venture.id);
    memory?.changes?.forEach((change, idx) => {
      versions.push({
        id: `kh-mem-${node.id}-${idx}`,
        nodeId: node.id,
        version: idx + 2,
        label: "Memory sync",
        summary: `Cambio registrado (+${change.deltaDays}d)`,
        createdAt: change.updatedAt,
        source: "lib/intelligence-layer/venture-memory",
      });
    });
  }

  if (node.id === "research-market" && venture.researchMeta?.source) {
    versions.push({
      id: versionId(node.id, 2),
      nodeId: node.id,
      version: 2,
      label: `Research (${venture.researchMeta.source})`,
      summary: `Generado vía ${venture.researchMeta.provider ?? venture.researchMeta.source}`,
      createdAt: venture.updatedAt,
      source: "lib/ai/research",
    });
  }

  if (node.id === "product-prd" && venture.productMeta?.source) {
    versions.push({
      id: versionId(node.id, 2),
      nodeId: node.id,
      version: 2,
      label: `PRD (${venture.productMeta.source})`,
      summary: venture.productMeta.usedResearch
        ? "PRD generado con research"
        : "PRD generado sin research",
      createdAt: venture.updatedAt,
      source: "lib/ai/product",
    });
  }

  return versions.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function buildAllVersions(
  venture: VentureProject,
  nodes: KnowledgeNode[]
): Record<string, KnowledgeVersion[]> {
  const map: Record<string, KnowledgeVersion[]> = {};
  for (const node of nodes) {
    map[node.id] = buildVersionsForNode(venture, node);
  }
  return map;
}
