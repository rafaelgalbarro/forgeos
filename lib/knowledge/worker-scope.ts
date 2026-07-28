import type { KnowledgeEntryBase, KnowledgeQuery, WorkerKnowledgeScope } from "./types";
import type { KnowledgeStore } from "./types";

/** Maps worker ids to domains they are allowed to query by default. */
const WORKER_DOMAIN_MAP: Record<string, string[]> = {
  ceo: ["business-models", "patterns", "competitors"],
  founder: ["business-models", "patterns", "competitors"],
  research: ["competitors", "patterns", "business-models"],
  product: ["features", "patterns", "prompts", "ux"],
  ux: ["ux", "patterns", "features"],
  cto: ["architecture", "patterns", "prompts"],
  database: ["architecture", "patterns"],
  backend: ["architecture", "patterns", "prompts"],
  frontend: ["ux", "patterns", "features"],
  marketing: ["pricing", "business-models", "competitors"],
  legal: ["patterns"],
  qa: ["features", "patterns"],
};

export function createWorkerKnowledgeScope(store: KnowledgeStore, workerId: string): WorkerKnowledgeScope {
  return {
    workerId,
    query(query: Omit<KnowledgeQuery, "workerId">) {
      return store.query({ ...query, workerId });
    },
    getPrompts() {
      return store.query({ domain: "prompts", workerId });
    },
    getPatterns() {
      return store.query({ domain: "patterns", workerId });
    },
  };
}

export function getDefaultDomainsForWorker(workerId: string): string[] {
  return WORKER_DOMAIN_MAP[workerId] ?? [];
}

export function queryKnowledgeForWorker(
  store: KnowledgeStore,
  workerId: string,
  query: Omit<KnowledgeQuery, "workerId"> = {}
): KnowledgeEntryBase[] {
  return store.query({ ...query, workerId });
}
