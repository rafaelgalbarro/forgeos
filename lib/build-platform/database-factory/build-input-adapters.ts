import type { BuildDna as PlatformBuildDna } from "@/lib/build-platform/build-dna";
import { createOfficialBuildRegistry } from "@/lib/build-platform/build-registry";
import type { BuildContext } from "@/lib/build-platform/build-context";
import type { RegistryEntry } from "@/lib/build-platform/build-registry";
import type {
  BuildDna,
  BuildRegistry,
  BuildRegistryEntry,
  DatabaseFactoryInput,
} from "./types";

function normalizeBuildDna(dna: PlatformBuildDna): BuildDna {
  const completeness = dna.meta.completenessScore;
  return {
    productType: dna.stack.framework || "web-app",
    primaryPersona: "operator",
    dataComplexity: completeness >= 80 ? "high" : completeness >= 50 ? "medium" : "low",
    databaseEngine: dna.stack.database || "PostgreSQL (Supabase)",
    authProvider: dna.stack.auth || "Supabase Auth",
    multiTenant: dna.security.oauthRequired,
    modules: ["core", "operations", "analytics", "audit"],
  };
}

function normalizeEntry(entry: RegistryEntry): BuildRegistryEntry {
  const category =
    entry.type === "artifact"
      ? "entity"
      : entry.type === "generator"
        ? "migration"
        : entry.type === "template"
          ? "seed"
          : entry.type === "worker"
            ? "policy"
            : "entity";

  return {
    id: entry.id,
    name: entry.name,
    category,
    tags: entry.tags ?? [],
  };
}

function normalizeBuildRegistry(): BuildRegistry {
  const registry = createOfficialBuildRegistry();
  const entries = registry.list().map(normalizeEntry);
  return {
    entries,
    requiredEntities: ["organizations", "users", "audit_logs"],
    preferredIndexes: ["idx_users_org", "idx_audit_created"],
  };
}

export function createDatabaseFactoryInput(
  context: BuildContext,
  dna: PlatformBuildDna
): DatabaseFactoryInput {
  return {
    context,
    dna: normalizeBuildDna(dna),
    registry: normalizeBuildRegistry(),
  };
}
