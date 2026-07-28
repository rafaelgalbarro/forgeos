/** Build Registry — type contracts (Epic 6.2). */

export type RegistryEntryStatus =
  | "draft"
  | "experimental"
  | "beta"
  | "stable"
  | "deprecated";

export type RegistryEntryType =
  | "generator"
  | "provider"
  | "artifact"
  | "worker"
  | "template"
  | "technology";

export type GeneratorCategory =
  | "frontend"
  | "backend"
  | "database"
  | "deployment"
  | "qa";

export interface RegistryCapability {
  id: string;
  label: string;
  description?: string;
}

export interface RegistryEntry {
  id: string;
  name: string;
  type: RegistryEntryType;
  version: string;
  status: RegistryEntryStatus;
  description: string;
  capabilities: RegistryCapability[];
  category?: string;
  tags?: string[];
  updatedAt: string;
}

export interface RegistryQuery {
  type?: RegistryEntryType;
  status?: RegistryEntryStatus;
  category?: string;
  capability?: string;
  tag?: string;
  version?: string;
  search?: string;
}

export interface RegistryStats {
  total: number;
  byType: Record<RegistryEntryType, number>;
  byStatus: Record<RegistryEntryStatus, number>;
}

export interface BuildRegistry {
  register(entry: RegistryEntry): RegistryEntry;
  unregister(id: string): boolean;
  find(id: string): RegistryEntry | undefined;
  list(): RegistryEntry[];
  filter(query: RegistryQuery): RegistryEntry[];
  stats(): RegistryStats;
  clear(): void;
}

export const REGISTRY_ENTRY_TYPE_LABELS: Record<RegistryEntryType, string> = {
  generator: "Generator",
  provider: "Provider",
  artifact: "Artifact",
  worker: "Worker",
  template: "Template",
  technology: "Technology",
};

export const REGISTRY_ENTRY_STATUS_LABELS: Record<RegistryEntryStatus, string> = {
  draft: "Draft",
  experimental: "Experimental",
  beta: "Beta",
  stable: "Stable",
  deprecated: "Deprecated",
};

export const GENERATOR_CATEGORY_LABELS: Record<GeneratorCategory, string> = {
  frontend: "Frontend",
  backend: "Backend",
  database: "Database",
  deployment: "Deployment",
  qa: "QA",
};
