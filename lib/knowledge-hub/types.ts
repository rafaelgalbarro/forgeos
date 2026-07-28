/** Venture Knowledge Hub — core types (Epic 7.5). */

export type KnowledgeCategory =
  | "discovery"
  | "research"
  | "product"
  | "architecture"
  | "ux"
  | "brand"
  | "build"
  | "deployment"
  | "memory"
  | "decisions"
  | "knowledge";

export type KnowledgeNodeStatus = "empty" | "partial" | "complete";

export interface KnowledgeNode {
  id: string;
  category: KnowledgeCategory;
  title: string;
  summary: string;
  content: string;
  status: KnowledgeNodeStatus;
  sourceModule: string;
  updatedAt: string;
  parentId?: string;
  tags?: string[];
}

export interface KnowledgeCategoryGroup {
  id: KnowledgeCategory;
  label: string;
  nodeIds: string[];
}

export interface DocumentTree {
  ventureId: string;
  ventureName: string;
  categories: KnowledgeCategoryGroup[];
  nodes: KnowledgeNode[];
  builtAt: string;
}

export interface KnowledgeVersion {
  id: string;
  nodeId: string;
  version: number;
  label: string;
  summary: string;
  createdAt: string;
  source: string;
}

export type KnowledgeRelationType =
  | "derived-from"
  | "references"
  | "informs"
  | "depends-on"
  | "related";

export interface KnowledgeRelation {
  id: string;
  fromNodeId: string;
  toNodeId: string;
  relationType: KnowledgeRelationType;
  label: string;
}

export interface KnowledgeSearchResult {
  node: KnowledgeNode;
  score: number;
  matchedFields: string[];
}

export interface KnowledgeHubIndex {
  ventureId: string;
  tree: DocumentTree;
  versions: Record<string, KnowledgeVersion[]>;
  relations: KnowledgeRelation[];
  builtAt: string;
}

export const KNOWLEDGE_CATEGORY_LABELS: Record<KnowledgeCategory, string> = {
  discovery: "Discovery",
  research: "Research",
  product: "Product",
  architecture: "Architecture",
  ux: "UX",
  brand: "Brand",
  build: "Build",
  deployment: "Deployment",
  memory: "Memory",
  decisions: "Decisions",
  knowledge: "Knowledge",
};

export const KNOWLEDGE_CATEGORY_ORDER: KnowledgeCategory[] = [
  "discovery",
  "research",
  "product",
  "architecture",
  "ux",
  "brand",
  "build",
  "deployment",
  "memory",
  "decisions",
  "knowledge",
];
