/** ForgeOS Skill Store Lab — RC4.8 visualization harness. */

import { LAB_MOCK_VENTURE_ID } from "@/lib/lab/mock-venture";
import {
  browseCatalog,
  buildAllDependencyGraphs,
  buildStoreCatalog,
  countByCategory,
  getFeaturedListings,
  getInstalledSummary,
  getMarketplaceStats,
  getStoreState,
  installItem,
  readInstalledItems,
  syncStoreState,
} from "@/lib/skills-store";
import type { DependencyGraph, InstalledItem, MarketplaceListing, StoreItem } from "@/lib/skills-store";

export interface SkillStoreLabSnapshot {
  ventureId: string;
  catalogTotal: number;
  categoryCounts: ReturnType<typeof countByCategory>;
  featured: StoreItem[];
  marketplaceFeatured: MarketplaceListing[];
  marketplaceStats: ReturnType<typeof getMarketplaceStats>;
  installed: InstalledItem[];
  installedSummary: ReturnType<typeof getInstalledSummary>;
  dependencyGraphs: DependencyGraph[];
  sampleGraph: DependencyGraph | null;
  providers: ReturnType<typeof browseCatalog>;
  lastSyncedAt: string;
}

export async function runSkillStoreLab(
  ventureId = LAB_MOCK_VENTURE_ID
): Promise<SkillStoreLabSnapshot> {
  const state = syncStoreState();
  const categoryCounts = countByCategory();
  const catalog = buildStoreCatalog();
  const dependencyGraphs = buildAllDependencyGraphs(catalog);
  const sampleGraph = dependencyGraphs.find((g) => g.rootId === "vercel") ?? dependencyGraphs[0] ?? null;

  const installed = readInstalledItems(ventureId);
  if (installed.length === 0) {
    installItem("github", ventureId, { skipDependencyCheck: true });
    installItem("vercel", ventureId);
  }

  return {
    ventureId,
    catalogTotal: catalog.length,
    categoryCounts,
    featured: browseCatalog({ category: "skills" }).items.slice(0, 6),
    marketplaceFeatured: getFeaturedListings(6),
    marketplaceStats: getMarketplaceStats(),
    installed: readInstalledItems(ventureId),
    installedSummary: getInstalledSummary(ventureId),
    dependencyGraphs: dependencyGraphs.slice(0, 10),
    sampleGraph,
    providers: browseCatalog({ category: "providers" }),
    lastSyncedAt: state.lastSyncedAt,
  };
}

export function getSkillStoreLabState(ventureId = LAB_MOCK_VENTURE_ID): SkillStoreLabSnapshot {
  getStoreState(ventureId);
  return {
    ventureId,
    catalogTotal: buildStoreCatalog().length,
    categoryCounts: countByCategory(),
    featured: browseCatalog({ category: "skills" }).items.slice(0, 6),
    marketplaceFeatured: getFeaturedListings(6),
    marketplaceStats: getMarketplaceStats(),
    installed: readInstalledItems(ventureId),
    installedSummary: getInstalledSummary(ventureId),
    dependencyGraphs: buildAllDependencyGraphs(buildStoreCatalog()).slice(0, 10),
    sampleGraph: buildAllDependencyGraphs(buildStoreCatalog()).find((g) => g.rootId === "vercel") ?? null,
    providers: browseCatalog({ category: "providers" }),
    lastSyncedAt: new Date().toISOString(),
  };
}
