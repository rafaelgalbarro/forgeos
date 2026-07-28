/** Venture Knowledge Hub — cross-links between nodes (Epic 7.5). */

import type { DocumentTree, KnowledgeRelation } from "./types";

const RELATION_DEFS: Array<{
  from: string;
  to: string;
  relationType: KnowledgeRelation["relationType"];
  label: string;
}> = [
  { from: "product-prd", to: "research-market", relationType: "derived-from", label: "PRD basado en research" },
  { from: "product-prd", to: "discovery-context", relationType: "derived-from", label: "PRD informado por discovery" },
  { from: "research-competitors", to: "research-market", relationType: "derived-from", label: "Competidores del informe de mercado" },
  { from: "architecture-overview", to: "product-prd", relationType: "informs", label: "Arquitectura alineada al PRD" },
  { from: "ux-overview", to: "product-prd", relationType: "derived-from", label: "UX derivada del PRD" },
  { from: "brand-identity", to: "discovery-context", relationType: "references", label: "Marca informada por discovery" },
  { from: "build-context", to: "product-prd", relationType: "depends-on", label: "Build context requiere PRD" },
  { from: "build-context", to: "architecture-overview", relationType: "depends-on", label: "Build context usa arquitectura" },
  { from: "build-dna", to: "build-context", relationType: "derived-from", label: "DNA derivado del build context" },
  { from: "deployment-target", to: "build-dna", relationType: "depends-on", label: "Deployment definido por DNA" },
  { from: "memory-venture", to: "research-market", relationType: "references", label: "Memoria resume research" },
  { from: "memory-executive", to: "decisions-graph", relationType: "related", label: "Memoria ejecutiva y decisiones" },
  { from: "decisions-formal", to: "decisions-graph", relationType: "derived-from", label: "Decisiones formales del grafo" },
  { from: "product-knowledge-refs", to: "knowledge-catalog", relationType: "references", label: "Refs de catálogo usadas en PRD" },
  { from: "knowledge-intelligence", to: "discovery-context", relationType: "informs", label: "Tags de intelligence" },
  { from: "architecture-database", to: "architecture-overview", relationType: "derived-from", label: "DB parte de arquitectura" },
  { from: "architecture-backend", to: "architecture-overview", relationType: "derived-from", label: "Backend parte de arquitectura" },
  { from: "architecture-frontend", to: "architecture-overview", relationType: "derived-from", label: "Frontend parte de arquitectura" },
  { from: "build-plan", to: "build-context", relationType: "derived-from", label: "Plan de build del context" },
  { from: "decisions-clarified", to: "discovery-context", relationType: "references", label: "Decisiones de discovery documentadas" },
];

export function buildKnowledgeRelations(tree: DocumentTree): KnowledgeRelation[] {
  const nodeIds = new Set(tree.nodes.map((n) => n.id));
  const relations: KnowledgeRelation[] = [];

  for (const def of RELATION_DEFS) {
    if (!nodeIds.has(def.from) || !nodeIds.has(def.to)) continue;
    const fromNode = tree.nodes.find((n) => n.id === def.from);
    const toNode = tree.nodes.find((n) => n.id === def.to);
    if (fromNode?.status === "empty" && toNode?.status === "empty") continue;

    relations.push({
      id: `kh-rel-${def.from}-${def.to}`,
      fromNodeId: def.from,
      toNodeId: def.to,
      relationType: def.relationType,
      label: def.label,
    });
  }

  return relations;
}

export function getRelationsForNode(
  relations: KnowledgeRelation[],
  nodeId: string
): KnowledgeRelation[] {
  return relations.filter((r) => r.fromNodeId === nodeId || r.toNodeId === nodeId);
}

export function getRelatedNodeIds(
  relations: KnowledgeRelation[],
  nodeId: string
): string[] {
  const ids = new Set<string>();
  for (const r of relations) {
    if (r.fromNodeId === nodeId) ids.add(r.toNodeId);
    if (r.toNodeId === nodeId) ids.add(r.fromNodeId);
  }
  return [...ids];
}
