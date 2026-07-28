/** RC9 — Store engine (adapter over skills-store + ecosystem). */

import {
  browseCatalog,
  countByCategory,
  getInstalledSummary,
  installItem,
  isItemInstalled,
  readInstalledItems,
  syncStoreState,
  uninstallItem,
} from "@/lib/skills-store";
import type { InstalledItem, StoreCategory, StoreItem } from "@/lib/skills-store";
import { getAllEcosystemPacks, searchEcosystemPacks } from "./marketplace-engine";
import type { EcosystemPack, EcosystemPackType } from "./types";

export interface EcosystemStoreItem {
  id: string;
  name: string;
  packType: EcosystemPackType;
  version: string;
  description: string;
  status: string;
  priceLabel: string;
  source: "skill-store" | "ecosystem";
  skillStoreItemId?: string;
}

export function syncEcosystemStore(): void {
  syncStoreState();
}

export function listStoreItems(packType?: EcosystemPackType): EcosystemStoreItem[] {
  const packs = packType
    ? searchEcosystemPacks({ packType }).packs
    : getAllEcosystemPacks();
  return packs.map((p) => ({
    id: p.id,
    name: p.name,
    packType: p.packType,
    version: p.version,
    description: p.description,
    status: p.status,
    priceLabel: p.priceLabel,
    source: p.skillStoreItemId ? "skill-store" : "ecosystem",
    skillStoreItemId: p.skillStoreItemId,
  }));
}

export function getSkillStoreItems(category?: StoreCategory): StoreItem[] {
  return browseCatalog(category ? { category } : {}).items;
}

export function isPackInstalled(packId: string, ventureId: string): boolean {
  const pack = getAllEcosystemPacks().find((p) => p.id === packId);
  const itemId = pack?.skillStoreItemId ?? packId;
  return isItemInstalled(itemId, ventureId);
}

export function getEcosystemInstalled(ventureId: string): InstalledItem[] {
  return readInstalledItems(ventureId);
}

export {
  browseCatalog,
  countByCategory,
  getInstalledSummary,
  installItem,
  uninstallItem,
  readInstalledItems,
  isItemInstalled,
};
