/** ForgeOS Universal Skill Store — localStorage persistence (RC4.8). */

import { readStorage, writeStorage } from "@/lib/intelligence-layer/memory/storage";
import { STORAGE_KEYS } from "@/lib/intelligence-layer/memory/types";
import { buildStoreCatalog } from "./registry";
import { buildMarketplaceListings } from "./marketplace";
import type { InstalledItem, MarketplaceListing, SkillStoreState, StoreItem } from "./types";

export function readCatalogCache(): StoreItem[] {
  const cached = readStorage<StoreItem[]>(STORAGE_KEYS.skillStoreCatalog, []);
  return cached.length > 0 ? cached : buildStoreCatalog();
}

export function writeCatalogCache(catalog: StoreItem[]): void {
  writeStorage(STORAGE_KEYS.skillStoreCatalog, catalog);
}

export function readInstalledItems(ventureId?: string): InstalledItem[] {
  const all = readStorage<InstalledItem[]>(STORAGE_KEYS.skillStoreInstalled, []);
  return ventureId ? all.filter((i) => i.ventureId === ventureId) : all;
}

export function writeInstalledItems(items: InstalledItem[]): void {
  writeStorage(STORAGE_KEYS.skillStoreInstalled, items.slice(0, 500));
}

export function readMarketplaceCache(): MarketplaceListing[] {
  const cached = readStorage<MarketplaceListing[]>(STORAGE_KEYS.skillStoreMarketplace, []);
  return cached.length > 0 ? cached : buildMarketplaceListings();
}

export function writeMarketplaceCache(listings: MarketplaceListing[]): void {
  writeStorage(STORAGE_KEYS.skillStoreMarketplace, listings);
}

export function syncStoreState(): SkillStoreState {
  const catalog = buildStoreCatalog();
  const marketplace = buildMarketplaceListings();
  writeCatalogCache(catalog);
  writeMarketplaceCache(marketplace);
  return {
    catalog,
    installed: readInstalledItems(),
    marketplace,
    lastSyncedAt: new Date().toISOString(),
  };
}

export function getStoreState(ventureId?: string): SkillStoreState {
  return {
    catalog: readCatalogCache(),
    installed: readInstalledItems(ventureId),
    marketplace: readMarketplaceCache(),
    lastSyncedAt: new Date().toISOString(),
  };
}

export function isItemInstalled(itemId: string, ventureId: string): boolean {
  return readInstalledItems(ventureId).some((i) => i.itemId === itemId);
}
