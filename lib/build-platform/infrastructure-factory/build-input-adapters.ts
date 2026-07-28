import type { BuildDna as PlatformBuildDna } from "@/lib/build-platform/build-dna";
import { createOfficialBuildRegistry } from "@/lib/build-platform/build-registry";
import type { BuildContext } from "@/lib/build-platform/build-context";
import type { RegistryEntry } from "@/lib/build-platform/build-registry";
import type {
  InfraBuildDna,
  InfraBuildRegistry,
  InfraFactoryInput,
  InfraRegistryEntry,
} from "./types";

function normalizeBuildDna(dna: PlatformBuildDna): InfraBuildDna {
  return {
    deployment: dna.stack.deployment || "Vercel",
    cicd: dna.stack.cicd || "GitHub Actions",
    database: dna.stack.database || "PostgreSQL (Supabase)",
    auth: dna.stack.auth || "Supabase Auth",
    monitoring: dna.stack.monitoring || "Sentry",
    environments: dna.deployment.environments.filter(
      (env): env is InfraBuildDna["environments"][number] =>
        env === "development" || env === "staging" || env === "production"
    ),
    rollbackStrategy: dna.deployment.rollbackStrategy,
    deploymentRules: dna.deployment.rules,
    complexity:
      dna.meta.completenessScore >= 80
        ? "high"
        : dna.meta.completenessScore >= 50
          ? "medium"
          : "low",
  };
}

function normalizeEntry(entry: RegistryEntry): InfraRegistryEntry {
  const category =
    entry.type === "provider"
      ? "provider"
      : entry.type === "worker"
        ? "worker"
        : entry.type === "generator"
          ? "generator"
          : "technology";

  return {
    id: entry.id,
    name: entry.name,
    category,
    tags: entry.tags ?? [],
  };
}

function normalizeBuildRegistry(): InfraBuildRegistry {
  const registry = createOfficialBuildRegistry();
  const entries = registry.list().map(normalizeEntry);

  const deploymentProviders = registry
    .filter({ type: "provider", category: "deployment" })
    .map((entry) => entry.id);
  const cicdProviders = registry
    .filter({ type: "provider", category: "cicd" })
    .map((entry) => entry.id);
  const databaseProviders = registry
    .filter({ type: "provider", category: "database" })
    .map((entry) => entry.id);

  return {
    entries,
    deploymentProviders,
    cicdProviders,
    databaseProviders,
  };
}

export function createInfraFactoryInput(
  context: BuildContext,
  dna: PlatformBuildDna
): InfraFactoryInput {
  return {
    context,
    dna: normalizeBuildDna(dna),
    registry: normalizeBuildRegistry(),
  };
}
