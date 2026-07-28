/** Venture Knowledge Hub — public API (Epic 7.5). */

export type {
  KnowledgeCategory,
  KnowledgeNode,
  KnowledgeNodeStatus,
  KnowledgeCategoryGroup,
  DocumentTree,
  KnowledgeVersion,
  KnowledgeRelation,
  KnowledgeRelationType,
  KnowledgeSearchResult,
  KnowledgeHubIndex,
} from "./types";

export {
  KNOWLEDGE_CATEGORY_LABELS,
  KNOWLEDGE_CATEGORY_ORDER,
} from "./types";

export {
  adaptAllKnowledgeNodes,
  adaptDiscoveryNodes,
  adaptResearchNodes,
  adaptProductNodes,
  adaptArchitectureNodes,
  adaptUxNodes,
  adaptBrandNodes,
  adaptBuildNodes,
  adaptDeploymentNodes,
  adaptMemoryNodes,
  adaptDecisionNodes,
  adaptKnowledgeCatalogNodes,
} from "./knowledge-adapters";

export {
  buildDocumentTree,
  getChildNodes,
  getNodeById,
  getRootNodesForCategory,
  countNodesWithContent,
} from "./knowledge-tree";

export {
  buildVersionsForNode,
  buildAllVersions,
} from "./knowledge-versions";

export {
  buildKnowledgeRelations,
  getRelationsForNode,
  getRelatedNodeIds,
} from "./knowledge-relations";

export {
  searchKnowledgeNodes,
  filterTreeBySearch,
  highlightMatch,
  nodeMatchesQuery,
} from "./knowledge-search";

export {
  buildKnowledgeHubIndex,
  getKnowledgeHubIndex,
  getOrBuildKnowledgeHubIndex,
  invalidateKnowledgeHubIndex,
  clearKnowledgeHubStore,
  listIndexedVentureIds,
} from "./knowledge-store";
