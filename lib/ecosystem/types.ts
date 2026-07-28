/** RC9 — ForgeOS Ecosystem type contracts (sandbox / dry-run only). */

import type { StoreCategory, MarketplaceListing, StoreItem } from "@/lib/skills-store/types";

export const ECOSYSTEM_SANDBOX_DISCLAIMER =
  "Simulación sandbox — sin instalación real" as const;

export type EcosystemPackType =
  | "skills"
  | "capabilities"
  | "departments"
  | "workers"
  | "templates"
  | "knowledge-packs"
  | "prompt-packs"
  | "ai-packs"
  | "business-packs"
  | "build-packs"
  | "plugins";

export type CreatorAssetType =
  | "skill"
  | "worker"
  | "department"
  | "template"
  | "knowledge"
  | "playbook"
  | "business-model"
  | "plugin";

export type SandboxMode = "dry-run" | "simulate";

export type PackStatus = "active" | "beta" | "sandbox" | "deprecated";

export interface EcosystemPack {
  id: string;
  name: string;
  packType: EcosystemPackType;
  version: string;
  description: string;
  tags: string[];
  publisher: string;
  status: PackStatus;
  updatedAt: string;
  priceLabel: string;
  dependencies: string[];
  capabilities: string[];
  skillStoreItemId?: string;
  featured?: boolean;
  rating?: number;
  reviewCount?: number;
  installCount?: number;
}

export interface EcosystemListing extends MarketplaceListing {
  packType: EcosystemPackType;
  ecosystemId: string;
  capabilities: string[];
  sandboxOnly: true;
}

export interface PluginManifest {
  id: string;
  name: string;
  version: string;
  description: string;
  entryPoint: string;
  permissions: string[];
  hooks: string[];
  status: PackStatus;
  publisher: string;
}

export interface SdkModule {
  id: string;
  name: string;
  description: string;
  category: "core" | "marketplace" | "plugins" | "ventures" | "ai";
  exports: string[];
  version: string;
}

export interface CreatorListing {
  id: string;
  assetType: CreatorAssetType;
  title: string;
  description: string;
  creator: string;
  priceLabel: string;
  revenueSharePct: number;
  rating: number;
  salesCount: number;
  status: PackStatus;
  tags: string[];
}

export interface QualityScore {
  packId: string;
  overall: number;
  documentation: number;
  reliability: number;
  security: number;
  community: number;
  disclaimer: typeof ECOSYSTEM_SANDBOX_DISCLAIMER;
}

export interface PackReview {
  id: string;
  packId: string;
  author: string;
  rating: number;
  title: string;
  body: string;
  createdAt: string;
  verified: boolean;
}

export interface VersionRecord {
  packId: string;
  semver: string;
  changelog: string[];
  releasedAt: string;
  compatibleWith: string[];
}

export interface DependencyResolution {
  packId: string;
  resolved: string[];
  missing: string[];
  optional: string[];
  graph: { from: string; to: string; type: "requires" | "recommends" }[];
}

export interface InstallSimulationStep {
  id: string;
  label: string;
  status: "pending" | "running" | "done" | "skipped";
  message?: string;
}

export interface InstallSimulationResult {
  packId: string;
  packName: string;
  mode: SandboxMode;
  success: boolean;
  steps: InstallSimulationStep[];
  ceoMessage: string;
  disclaimer: typeof ECOSYSTEM_SANDBOX_DISCLAIMER;
  resolvedDependencies: string[];
  durationMs: number;
}

export interface EcosystemCatalogFilter {
  query?: string;
  packType?: EcosystemPackType | "all";
  tags?: string[];
  status?: PackStatus;
  featured?: boolean;
}

export interface EcosystemCatalogResult {
  packs: EcosystemPack[];
  total: number;
  byType: Record<EcosystemPackType, number>;
}

export interface EcosystemState {
  packs: EcosystemPack[];
  plugins: PluginManifest[];
  sdkModules: SdkModule[];
  creatorListings: CreatorListing[];
  lastSyncedAt: string;
}

/** Map skill-store categories to ecosystem pack types. */
export function storeCategoryToPackType(category: StoreCategory): EcosystemPackType | null {
  const map: Partial<Record<StoreCategory, EcosystemPackType>> = {
    skills: "skills",
    departments: "departments",
    workers: "workers",
    templates: "templates",
    "knowledge-packs": "knowledge-packs",
    "build-packs": "build-packs",
    "prompt-packs": "prompt-packs",
  };
  return map[category] ?? null;
}

export function storeItemToEcosystemPack(item: StoreItem): EcosystemPack | null {
  const packType = storeCategoryToPackType(item.category);
  if (!packType) return null;
  return {
    id: `eco-${item.id}`,
    name: item.name,
    packType,
    version: item.version,
    description: item.description,
    tags: item.tags,
    publisher: item.source.includes("forgeos") ? "ForgeOS Official" : "ForgeOS Community",
    status: item.status,
    updatedAt: item.updatedAt,
    priceLabel: "Free",
    dependencies: [],
    capabilities: [],
    skillStoreItemId: item.id,
  };
}
