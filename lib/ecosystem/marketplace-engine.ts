/** RC9 — Marketplace engine (composes skills-store + ecosystem packs). */

import {
  browseCatalog,
  buildMarketplaceListings,
  getFeaturedListings,
  getMarketplaceStats,
  syncStoreState,
} from "@/lib/skills-store";
import { ECOSYSTEM_PACK_CATALOG } from "./catalog";
import type {
  EcosystemCatalogFilter,
  EcosystemCatalogResult,
  EcosystemListing,
  EcosystemPack,
  EcosystemPackType,
} from "./types";
import { storeItemToEcosystemPack } from "./types";

function packToListing(pack: EcosystemPack): EcosystemListing {
  return {
    id: `mkt-eco-${pack.id}`,
    itemId: pack.skillStoreItemId ?? pack.id,
    ecosystemId: pack.id,
    category: pack.packType === "plugins" ? "providers" : "skills",
    packType: pack.packType,
    title: pack.name,
    subtitle: pack.description.slice(0, 100),
    featured: pack.featured ?? false,
    rating: pack.rating ?? 4.0,
    reviewCount: pack.reviewCount ?? 0,
    installCount: pack.installCount ?? 0,
    publisher: pack.publisher,
    priceLabel: pack.priceLabel,
    badges: pack.status === "sandbox" ? ["Sandbox"] : pack.featured ? ["Featured"] : [],
    capabilities: pack.capabilities,
    sandboxOnly: true,
  };
}

export function buildEcosystemPacksFromSkillStore(): EcosystemPack[] {
  const catalog = browseCatalog({});
  return catalog.items
    .map(storeItemToEcosystemPack)
    .filter((p): p is EcosystemPack => p !== null);
}

export function getAllEcosystemPacks(): EcosystemPack[] {
  const fromStore = buildEcosystemPacksFromSkillStore();
  const storeIds = new Set(fromStore.map((p) => p.skillStoreItemId).filter(Boolean));
  const native = ECOSYSTEM_PACK_CATALOG.filter(
    (p) => !p.skillStoreItemId || !storeIds.has(p.skillStoreItemId)
  );
  return [...native, ...fromStore];
}

function matchesPack(pack: EcosystemPack, filter: EcosystemCatalogFilter): boolean {
  if (filter.packType && filter.packType !== "all" && pack.packType !== filter.packType) {
    return false;
  }
  if (filter.status && pack.status !== filter.status) return false;
  if (filter.featured && !pack.featured) return false;
  if (filter.tags?.length && !filter.tags.every((t) => pack.tags.includes(t))) return false;
  if (filter.query) {
    const q = filter.query.toLowerCase();
    const hay = `${pack.name} ${pack.description} ${pack.tags.join(" ")} ${pack.id}`.toLowerCase();
    if (!hay.includes(q)) return false;
  }
  return true;
}

export function searchEcosystemPacks(filter: EcosystemCatalogFilter = {}): EcosystemCatalogResult {
  const packs = getAllEcosystemPacks().filter((p) => matchesPack(p, filter));
  const byType = {} as Record<EcosystemPackType, number>;
  for (const p of getAllEcosystemPacks()) {
    byType[p.packType] = (byType[p.packType] ?? 0) + 1;
  }
  return { packs, total: packs.length, byType };
}

export function getEcosystemFeatured(limit = 8): EcosystemListing[] {
  return getAllEcosystemPacks()
    .filter((p) => p.featured)
    .sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0))
    .slice(0, limit)
    .map(packToListing);
}

export function getEcosystemListings(): EcosystemListing[] {
  return getAllEcosystemPacks().map(packToListing);
}

export function getCombinedMarketplaceStats(): {
  skillStore: ReturnType<typeof getMarketplaceStats>;
  ecosystem: { totalPacks: number; featured: number; plugins: number; avgRating: number };
  combined: { totalListings: number; featured: number };
} {
  syncStoreState();
  const skillStore = getMarketplaceStats();
  const packs = getAllEcosystemPacks();
  const featured = packs.filter((p) => p.featured).length;
  const plugins = packs.filter((p) => p.packType === "plugins").length;
  const avgRating =
    packs.length > 0
      ? Math.round((packs.reduce((s, p) => s + (p.rating ?? 4), 0) / packs.length) * 10) / 10
      : 0;
  return {
    skillStore,
    ecosystem: { totalPacks: packs.length, featured, plugins, avgRating },
    combined: {
      totalListings: skillStore.totalListings + packs.length,
      featured: skillStore.featured + featured,
    },
  };
}

export function searchCrmPacks(): EcosystemPack[] {
  return searchEcosystemPacks({ query: "CRM" }).packs;
}

export {
  browseCatalog,
  buildMarketplaceListings,
  getFeaturedListings,
  getMarketplaceStats,
  syncStoreState,
};
