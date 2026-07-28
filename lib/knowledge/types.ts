/** Shared knowledge base types. */

export type KnowledgeDomain =
  | "architecture"
  | "business-models"
  | "competitors"
  | "features"
  | "patterns"
  | "pricing"
  | "prompts"
  | "ux";

export interface KnowledgeEntryBase {
  id: string;
  domain: KnowledgeDomain;
  title: string;
  description: string;
  tags: string[];
  version: string;
  createdAt: string;
  updatedAt: string;
  /** Worker ids that typically consume this entry. */
  workerIds: string[];
  metadata?: Record<string, unknown>;
}

export interface KnowledgeQuery {
  domain?: KnowledgeDomain | KnowledgeDomain[];
  tags?: string[];
  workerId?: string;
  search?: string;
  limit?: number;
}

export interface KnowledgeStore {
  getById(id: string): KnowledgeEntryBase | null;
  query(query: KnowledgeQuery): KnowledgeEntryBase[];
  getByDomain(domain: KnowledgeDomain): KnowledgeEntryBase[];
  register(entry: KnowledgeEntryBase): void;
  count(): number;
}

export interface WorkerKnowledgeScope {
  workerId: string;
  query(query: Omit<KnowledgeQuery, "workerId">): KnowledgeEntryBase[];
  getPrompts(): KnowledgeEntryBase[];
  getPatterns(): KnowledgeEntryBase[];
}
