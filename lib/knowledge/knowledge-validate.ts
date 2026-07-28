import type { KnowledgeDomain } from "./types";
import { knowledgeStore } from "./knowledge-store";
import type { KnowledgeStore } from "./types";

const REQUIRED_DOMAINS: KnowledgeDomain[] = [
  "business-models",
  "features",
  "architecture",
  "ux",
  "pricing",
  "competitors",
  "prompts",
];

const MIN_COUNTS: Partial<Record<KnowledgeDomain, number>> = {
  "business-models": 9,
  features: 15,
  architecture: 8,
  ux: 10,
  pricing: 6,
  competitors: 15,
  prompts: 12,
};

export interface KnowledgeValidationResult {
  valid: boolean;
  errors: string[];
  counts: Record<KnowledgeDomain, number>;
  total: number;
}

export function countByDomain(store: KnowledgeStore = knowledgeStore): Record<KnowledgeDomain, number> {
  const domains: KnowledgeDomain[] = [
    "architecture",
    "business-models",
    "competitors",
    "features",
    "patterns",
    "pricing",
    "prompts",
    "ux",
  ];

  return Object.fromEntries(
    domains.map((domain) => [domain, store.getByDomain(domain).length])
  ) as Record<KnowledgeDomain, number>;
}

export function validateKnowledgeCatalog(store: KnowledgeStore = knowledgeStore): KnowledgeValidationResult {
  const errors: string[] = [];
  const counts = countByDomain(store);
  const allEntries = Object.values(counts).reduce((sum, n) => sum + n, 0);

  const ids = new Set<string>();
  for (const domain of Object.keys(counts) as KnowledgeDomain[]) {
    for (const entry of store.getByDomain(domain)) {
      if (ids.has(entry.id)) {
        errors.push(`Duplicate knowledge id: ${entry.id}`);
      }
      ids.add(entry.id);
      if (!entry.title.trim()) errors.push(`Empty title in ${entry.id}`);
      if (!entry.description.trim()) errors.push(`Empty description in ${entry.id}`);
    }
  }

  for (const domain of REQUIRED_DOMAINS) {
    const min = MIN_COUNTS[domain] ?? 1;
    if (counts[domain] < min) {
      errors.push(`Domain ${domain} has ${counts[domain]} entries, expected at least ${min}`);
    }
  }

  if (allEntries < 70) {
    errors.push(`Total entries ${allEntries} below expected seed minimum (70)`);
  }

  return { valid: errors.length === 0, errors, counts, total: allEntries };
}
