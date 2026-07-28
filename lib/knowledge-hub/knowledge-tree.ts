/** Venture Knowledge Hub — document tree builder (Epic 7.5). */

import type { VentureProject } from "@/lib/domain/venture";
import { adaptAllKnowledgeNodes } from "./knowledge-adapters";
import type {
  DocumentTree,
  KnowledgeCategory,
  KnowledgeCategoryGroup,
  KnowledgeNode,
} from "./types";
import { KNOWLEDGE_CATEGORY_LABELS as LABELS, KNOWLEDGE_CATEGORY_ORDER as ORDER } from "./types";

export function buildDocumentTree(venture: VentureProject): DocumentTree {
  const nodes = adaptAllKnowledgeNodes(venture);
  const categories = buildCategoryGroups(nodes);

  return {
    ventureId: venture.id,
    ventureName: venture.name,
    categories,
    nodes,
    builtAt: new Date().toISOString(),
  };
}

function buildCategoryGroups(nodes: KnowledgeNode[]): KnowledgeCategoryGroup[] {
  return ORDER.map((category) => {
    const categoryNodes = nodes.filter((n) => n.category === category && !n.parentId);
    return {
      id: category,
      label: LABELS[category],
      nodeIds: categoryNodes.map((n) => n.id),
    };
  }).filter((g) => g.nodeIds.length > 0);
}

export function getChildNodes(tree: DocumentTree, parentId: string): KnowledgeNode[] {
  return tree.nodes.filter((n) => n.parentId === parentId);
}

export function getNodeById(tree: DocumentTree, nodeId: string): KnowledgeNode | undefined {
  return tree.nodes.find((n) => n.id === nodeId);
}

export function getRootNodesForCategory(
  tree: DocumentTree,
  category: KnowledgeCategory
): KnowledgeNode[] {
  return tree.nodes.filter((n) => n.category === category && !n.parentId);
}

export function countNodesWithContent(tree: DocumentTree): number {
  return tree.nodes.filter((n) => n.status !== "empty").length;
}
