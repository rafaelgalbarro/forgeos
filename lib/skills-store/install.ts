/** ForgeOS Universal Skill Store — mock install/uninstall (RC4.8). */

import { canInstall } from "./dependencies";
import { buildAllDependencyGraphs } from "./dependencies";
import { buildStoreCatalog, getStoreItemById } from "./registry";
import {
  isItemInstalled,
  readInstalledItems,
  writeInstalledItems,
} from "./store";
import type { InstalledItem, StoreCategory } from "./types";

export interface InstallResult {
  success: boolean;
  itemId: string;
  message: string;
  installed?: InstalledItem;
  missingDependencies?: string[];
}

export interface UninstallResult {
  success: boolean;
  itemId: string;
  message: string;
}

export function installItem(
  itemId: string,
  ventureId: string,
  options?: { skipDependencyCheck?: boolean }
): InstallResult {
  const item = getStoreItemById(itemId);
  if (!item) {
    return { success: false, itemId, message: `Item not found: ${itemId}` };
  }
  if (item.category === "versions" || item.category === "dependencies") {
    return { success: false, itemId, message: "Version and dependency records are not installable" };
  }
  if (isItemInstalled(itemId, ventureId)) {
    return { success: false, itemId, message: "Already installed" };
  }

  const installed = readInstalledItems(ventureId);
  const installedIds = new Set(installed.map((i) => i.itemId));

  if (!options?.skipDependencyCheck) {
    const catalog = buildStoreCatalog();
    const graphs = buildAllDependencyGraphs(catalog);
    const check = canInstall(itemId, installedIds, catalog, graphs);
    if (!check.ok) {
      return {
        success: false,
        itemId,
        message: `Missing dependencies: ${check.missing.join(", ")}`,
        missingDependencies: check.missing,
      };
    }
  }

  const record: InstalledItem = {
    itemId,
    category: item.category as Exclude<StoreCategory, "versions" | "dependencies">,
    ventureId,
    installedAt: new Date().toISOString(),
    version: item.version,
  };

  const all = readInstalledItems();
  all.unshift(record);
  writeInstalledItems(all);

  return { success: true, itemId, message: `Installed ${item.name}`, installed: record };
}

export function uninstallItem(itemId: string, ventureId: string): UninstallResult {
  if (!isItemInstalled(itemId, ventureId)) {
    return { success: false, itemId, message: "Not installed" };
  }

  const all = readInstalledItems();
  const filtered = all.filter((i) => !(i.itemId === itemId && i.ventureId === ventureId));
  writeInstalledItems(filtered);

  const item = getStoreItemById(itemId);
  return {
    success: true,
    itemId,
    message: `Uninstalled ${item?.name ?? itemId}`,
  };
}

export function installBatch(
  itemIds: string[],
  ventureId: string
): InstallResult[] {
  const results: InstallResult[] = [];
  for (const id of itemIds) {
    results.push(installItem(id, ventureId));
  }
  return results;
}

export function getInstalledSummary(ventureId: string): {
  total: number;
  byCategory: Record<string, number>;
} {
  const items = readInstalledItems(ventureId);
  const byCategory: Record<string, number> = {};
  for (const i of items) {
    byCategory[i.category] = (byCategory[i.category] ?? 0) + 1;
  }
  return { total: items.length, byCategory };
}
