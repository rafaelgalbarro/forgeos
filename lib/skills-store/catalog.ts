/** ForgeOS Universal Skill Store — catalog browse/search (RC4.8). */

import { buildStoreCatalog, countByCategory } from "./registry";
import type { CatalogFilter, CatalogResult, StoreCategory, StoreItem } from "./types";
import { isSkillListing } from "./types";

function matchesQuery(item: StoreItem, query: string): boolean {
  const q = query.toLowerCase();
  return (
    item.name.toLowerCase().includes(q) ||
    item.description.toLowerCase().includes(q) ||
    item.id.toLowerCase().includes(q) ||
    item.tags.some((t) => t.toLowerCase().includes(q))
  );
}

function matchesFilter(item: StoreItem, filter: CatalogFilter): boolean {
  if (filter.category && item.category !== filter.category) return false;
  if (filter.status && item.status !== filter.status) return false;
  if (filter.query && !matchesQuery(item, filter.query)) return false;
  if (filter.tags?.length && !filter.tags.every((t) => item.tags.includes(t))) return false;
  if (filter.provider && item.category === "skills" && item.provider !== filter.provider) return false;
  if (filter.domain && item.category === "skills" && item.domain !== filter.domain) return false;
  return true;
}

export function browseCatalog(filter: CatalogFilter = {}): CatalogResult {
  const all = buildStoreCatalog();
  const items = all.filter((i) => matchesFilter(i, filter));
  return {
    items,
    total: items.length,
    categories: countByCategory(),
  };
}

export function searchCatalog(query: string, category?: StoreCategory): CatalogResult {
  return browseCatalog({ query, category });
}

export function getCatalogByCategory(category: StoreCategory): StoreItem[] {
  return buildStoreCatalog().filter((i) => i.category === category);
}

export function getFeaturedItems(limit = 8): StoreItem[] {
  const skills = getCatalogByCategory("skills").filter((s) => s.status === "active");
  const templates = getCatalogByCategory("templates");
  const packs = [
    ...getCatalogByCategory("knowledge-packs"),
    ...getCatalogByCategory("prompt-packs"),
  ];
  return [...skills.slice(0, 4), ...templates.slice(0, 2), ...packs.slice(0, 2)].slice(0, limit);
}

export function listProviders(): string[] {
  const providers = new Set<string>();
  for (const item of getCatalogByCategory("skills")) {
    if (isSkillListing(item)) providers.add(item.provider);
  }
  return [...providers].sort();
}

export function listDomains(): string[] {
  const domains = new Set<string>();
  for (const item of getCatalogByCategory("skills")) {
    if (isSkillListing(item)) {
      if (item.domain) domains.add(item.domain);
      domains.add(item.skillCategory);
    }
  }
  return [...domains].sort();
}

export function categorizeItems(items: StoreItem[]): Record<StoreCategory, StoreItem[]> {
  const result = {} as Record<StoreCategory, StoreItem[]>;
  for (const item of items) {
    if (!result[item.category]) result[item.category] = [];
    result[item.category].push(item);
  }
  return result;
}
