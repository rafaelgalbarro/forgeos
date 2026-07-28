import type { KnowledgeDomain, KnowledgeEntryBase, KnowledgeQuery, KnowledgeStore } from "./types";
import { ARCHITECTURE_CATALOG } from "./architecture";
import { BUSINESS_MODEL_CATALOG } from "./business-models";
import { COMPETITOR_CATALOG } from "./competitors";
import { FEATURE_CATALOG } from "./features";
import { PATTERN_CATALOG } from "./patterns";
import { PRICING_CATALOG } from "./pricing";
import { PROMPT_CATALOG } from "./prompts";
import { UX_CATALOG } from "./ux";

function seedCatalog(): KnowledgeEntryBase[] {
  return [
    ...ARCHITECTURE_CATALOG,
    ...BUSINESS_MODEL_CATALOG,
    ...COMPETITOR_CATALOG,
    ...FEATURE_CATALOG,
    ...PATTERN_CATALOG,
    ...PRICING_CATALOG,
    ...PROMPT_CATALOG,
    ...UX_CATALOG,
  ];
}

function matchesDomain(entry: KnowledgeEntryBase, domain?: KnowledgeDomain | KnowledgeDomain[]): boolean {
  if (!domain) return true;
  const domains = Array.isArray(domain) ? domain : [domain];
  return domains.includes(entry.domain);
}

function matchesTags(entry: KnowledgeEntryBase, tags?: string[]): boolean {
  if (!tags?.length) return true;
  return tags.every((tag) => entry.tags.includes(tag));
}

function matchesWorker(entry: KnowledgeEntryBase, workerId?: string): boolean {
  if (!workerId) return true;
  return entry.workerIds.length === 0 || entry.workerIds.includes(workerId);
}

function matchesSearch(entry: KnowledgeEntryBase, search?: string): boolean {
  if (!search?.trim()) return true;
  const q = search.toLowerCase();
  return (
    entry.title.toLowerCase().includes(q) ||
    entry.description.toLowerCase().includes(q) ||
    entry.tags.some((t) => t.toLowerCase().includes(q))
  );
}

class InMemoryKnowledgeStore implements KnowledgeStore {
  private entries: Map<string, KnowledgeEntryBase>;

  constructor(seed: KnowledgeEntryBase[] = []) {
    this.entries = new Map(seed.map((e) => [e.id, e]));
  }

  getById(id: string): KnowledgeEntryBase | null {
    return this.entries.get(id) ?? null;
  }

  query(query: KnowledgeQuery): KnowledgeEntryBase[] {
    const results = [...this.entries.values()].filter(
      (entry) =>
        matchesDomain(entry, query.domain) &&
        matchesTags(entry, query.tags) &&
        matchesWorker(entry, query.workerId) &&
        matchesSearch(entry, query.search)
    );

    if (query.limit && query.limit > 0) {
      return results.slice(0, query.limit);
    }
    return results;
  }

  getByDomain(domain: KnowledgeDomain): KnowledgeEntryBase[] {
    return this.query({ domain });
  }

  register(entry: KnowledgeEntryBase): void {
    this.entries.set(entry.id, entry);
  }

  count(): number {
    return this.entries.size;
  }
}

/** Singleton store seeded with ForgeOS knowledge catalogs. */
export const knowledgeStore: KnowledgeStore = new InMemoryKnowledgeStore(seedCatalog());

export function createKnowledgeStore(seed: KnowledgeEntryBase[] = seedCatalog()): KnowledgeStore {
  return new InMemoryKnowledgeStore(seed);
}
