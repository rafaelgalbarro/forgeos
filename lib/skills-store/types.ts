/** ForgeOS Universal Skill Store — core types (RC4.8). */

import type { MeshDepartmentId } from "@/lib/executive-mesh/types";
import type { SkillCategory, SkillDefinition } from "@/lib/skills/types";
import type { RiskLevel } from "@/lib/skills-governance/types";

export type StoreCategory =
  | "skills"
  | "departments"
  | "workers"
  | "templates"
  | "knowledge-packs"
  | "build-packs"
  | "prompt-packs"
  | "providers"
  | "versions"
  | "dependencies";

export type StoreItemStatus = "active" | "beta" | "sandbox" | "deprecated";

export interface StoreItemBase {
  id: string;
  name: string;
  category: StoreCategory;
  version: string;
  description: string;
  tags: string[];
  source: string;
  updatedAt: string;
  status: StoreItemStatus;
}

export interface SkillListing extends StoreItemBase {
  category: "skills";
  skillCategory: SkillCategory;
  provider: string;
  capability: string;
  risks: string[];
  permissions: string[];
  governanceRisk?: RiskLevel;
  requiredCredentials: string[];
  domain?: string;
}

export interface DepartmentPack extends StoreItemBase {
  category: "departments";
  departmentId: MeshDepartmentId;
  role: string;
  reportsTo: MeshDepartmentId | null;
  specialties: string[];
  boardSeat: boolean;
  includedSkills: string[];
}

export interface WorkerPack extends StoreItemBase {
  category: "workers";
  workerId: string;
  department: string;
  capabilities: string[];
  supportedTasks: string[];
  priority: string;
}

export interface TemplatePack extends StoreItemBase {
  category: "templates";
  templateCategory: string;
  capabilities: string[];
}

export interface KnowledgePack extends StoreItemBase {
  category: "knowledge-packs";
  topics: string[];
  articleCount: number;
  linkedSkills: string[];
}

export interface BuildPack extends StoreItemBase {
  category: "build-packs";
  artifactType: string;
  buildCategory: string;
  capabilities: string[];
}

export interface PromptPack extends StoreItemBase {
  category: "prompt-packs";
  promptCount: number;
  useCases: string[];
  linkedDepartments: MeshDepartmentId[];
}

export interface ProviderListing extends StoreItemBase {
  category: "providers";
  providerId: string;
  skillCount: number;
  domains: string[];
  credentialKeys: string[];
}

export interface VersionInfo extends StoreItemBase {
  category: "versions";
  itemId: string;
  itemCategory: Exclude<StoreCategory, "versions" | "dependencies">;
  semver: string;
  changelog: string[];
  releasedAt: string;
  compatibleWith: string[];
}

export interface DependencyNode {
  id: string;
  name: string;
  category: StoreCategory;
}

export interface DependencyEdge {
  from: string;
  to: string;
  type: "requires" | "recommends" | "extends";
}

export interface DependencyGraph extends StoreItemBase {
  category: "dependencies";
  rootId: string;
  nodes: DependencyNode[];
  edges: DependencyEdge[];
}

export interface MarketplaceListing {
  id: string;
  itemId: string;
  category: StoreCategory;
  title: string;
  subtitle: string;
  featured: boolean;
  rating: number;
  reviewCount: number;
  installCount: number;
  publisher: string;
  priceLabel: string;
  badges: string[];
}

export type StoreItem =
  | SkillListing
  | DepartmentPack
  | WorkerPack
  | TemplatePack
  | KnowledgePack
  | BuildPack
  | PromptPack
  | ProviderListing
  | VersionInfo
  | DependencyGraph;

export interface CatalogFilter {
  category?: StoreCategory;
  query?: string;
  tags?: string[];
  status?: StoreItemStatus;
  provider?: string;
  domain?: string;
}

export interface CatalogResult {
  items: StoreItem[];
  total: number;
  categories: Record<StoreCategory, number>;
}

export interface InstalledItem {
  itemId: string;
  category: StoreCategory;
  ventureId: string;
  installedAt: string;
  version: string;
}

export interface SkillStoreState {
  catalog: StoreItem[];
  installed: InstalledItem[];
  marketplace: MarketplaceListing[];
  lastSyncedAt: string;
}

export function isSkillListing(item: StoreItem): item is SkillListing {
  return item.category === "skills";
}

export function skillToListing(skill: SkillDefinition, extras?: Partial<SkillListing>): SkillListing {
  return {
    id: skill.id,
    name: skill.name,
    category: "skills",
    version: skill.version,
    description: `${skill.capability} via ${skill.provider}`,
    tags: [skill.category, skill.provider],
    source: "lib/skills/registry",
    updatedAt: new Date().toISOString(),
    status: skill.status === "active" ? "active" : skill.status === "sandbox" ? "sandbox" : "deprecated",
    skillCategory: skill.category,
    provider: skill.provider,
    capability: skill.capability,
    risks: skill.risks,
    permissions: skill.permissions,
    requiredCredentials: skill.requiredCredentials,
    ...extras,
  };
}
