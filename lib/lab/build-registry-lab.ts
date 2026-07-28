/** Lab harness for Build Registry (Epic 6.2). */

import { createOfficialBuildRegistry } from "@/lib/build-platform/build-registry";
import {
  FRONTEND_GENERATORS,
  BACKEND_GENERATORS,
  DATABASE_GENERATORS,
  DEPLOYMENT_GENERATORS,
  QA_GENERATORS,
} from "@/lib/build-platform/build-registry/generator-registry";
import { OFFICIAL_PROVIDERS } from "@/lib/build-platform/build-registry/provider-registry";
import { OFFICIAL_ARTIFACTS } from "@/lib/build-platform/build-registry/artifact-registry";
import { OFFICIAL_BUILD_WORKERS } from "@/lib/build-platform/build-registry/worker-registry";
import { OFFICIAL_TEMPLATES } from "@/lib/build-platform/build-registry/template-registry";
import { OFFICIAL_TECHNOLOGIES } from "@/lib/build-platform/build-registry/technology-registry";
import type {
  BuildRegistry,
  RegistryEntry,
  RegistryEntryType,
  RegistryQuery,
  RegistryStats,
} from "@/lib/build-platform/build-registry/types";
import { GENERATOR_CATEGORY_LABELS } from "@/lib/build-platform/build-registry/types";

export interface RegistryDomainSummary {
  id: string;
  label: string;
  count: number;
  entryType: RegistryEntryType | "generator-group";
  category?: string;
}

export interface BuildRegistryLabSession {
  registry: BuildRegistry;
  getStats(): RegistryStats;
  getDomains(): RegistryDomainSummary[];
  getAll(): RegistryEntry[];
  filter(query: RegistryQuery): RegistryEntry[];
  find(id: string): RegistryEntry | undefined;
  getByType(type: RegistryEntryType): RegistryEntry[];
  getVersions(): string[];
  reset(): void;
}

export function createBuildRegistryLab(): BuildRegistryLabSession {
  let registry = createOfficialBuildRegistry();

  return {
    get registry() {
      return registry;
    },

    getStats(): RegistryStats {
      return registry.stats();
    },

    getDomains(): RegistryDomainSummary[] {
      return [
        { id: "frontend-generators", label: GENERATOR_CATEGORY_LABELS.frontend, count: FRONTEND_GENERATORS.length, entryType: "generator-group", category: "frontend" },
        { id: "backend-generators", label: GENERATOR_CATEGORY_LABELS.backend, count: BACKEND_GENERATORS.length, entryType: "generator-group", category: "backend" },
        { id: "database-generators", label: GENERATOR_CATEGORY_LABELS.database, count: DATABASE_GENERATORS.length, entryType: "generator-group", category: "database" },
        { id: "deployment-generators", label: GENERATOR_CATEGORY_LABELS.deployment, count: DEPLOYMENT_GENERATORS.length, entryType: "generator-group", category: "deployment" },
        { id: "qa-generators", label: GENERATOR_CATEGORY_LABELS.qa, count: QA_GENERATORS.length, entryType: "generator-group", category: "qa" },
        { id: "providers", label: "Providers", count: OFFICIAL_PROVIDERS.length, entryType: "provider" },
        { id: "artifacts", label: "Artifacts", count: OFFICIAL_ARTIFACTS.length, entryType: "artifact" },
        { id: "workers", label: "Build Workers", count: OFFICIAL_BUILD_WORKERS.length, entryType: "worker" },
        { id: "templates", label: "Templates", count: OFFICIAL_TEMPLATES.length, entryType: "template" },
        { id: "technologies", label: "Stacks / Technologies", count: OFFICIAL_TECHNOLOGIES.length, entryType: "technology" },
      ];
    },

    getAll(): RegistryEntry[] {
      return registry.list();
    },

    filter(query: RegistryQuery): RegistryEntry[] {
      return registry.filter(query);
    },

    find(id: string): RegistryEntry | undefined {
      return registry.find(id);
    },

    getByType(type: RegistryEntryType): RegistryEntry[] {
      return registry.filter({ type });
    },

    getVersions(): string[] {
      const versions = new Set(registry.list().map((e) => e.version));
      return [...versions].sort();
    },

    reset(): void {
      registry = createOfficialBuildRegistry();
    },
  };
}
