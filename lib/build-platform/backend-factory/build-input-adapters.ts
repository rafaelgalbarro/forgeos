import type { BuildDna as PlatformBuildDna } from "@/lib/build-platform/build-dna";
import { createOfficialBuildRegistry } from "@/lib/build-platform/build-registry";
import type { BuildContext } from "@/lib/build-platform/build-context";
import type { RegistryEntry } from "@/lib/build-platform/build-registry";
import type {
  BackendBuildDna,
  BackendBuildRegistry,
  BackendFactoryInput,
  BackendRegistryEntry,
} from "./types";

function normalizeBuildDna(dna: PlatformBuildDna): BackendBuildDna {
  return {
    backendFramework: dna.stack.backend || dna.stack.framework || "nextjs-api",
    database: dna.stack.database || "postgresql",
    authProvider: dna.stack.auth || "oauth",
    architecture: dna.architecture.architecture || "layered",
    ddd: dna.architecture.ddd,
    cleanArchitecture: dna.architecture.cleanArchitecture,
    oauthRequired: dna.security.oauthRequired,
    securityRules: dna.security.rules,
    complexity:
      dna.meta.completenessScore >= 80
        ? "high"
        : dna.meta.completenessScore >= 50
          ? "medium"
          : "low",
    modules: ["core", "operations", "integrations"],
  };
}

function normalizeEntry(entry: RegistryEntry): BackendRegistryEntry {
  const category =
    entry.type === "generator"
      ? "generator"
      : entry.type === "worker"
        ? "worker"
        : entry.type === "provider"
          ? "provider"
          : "technology";

  return {
    id: entry.id,
    name: entry.name,
    category,
    tags: entry.tags ?? [],
  };
}

function normalizeBuildRegistry(): BackendBuildRegistry {
  const registry = createOfficialBuildRegistry();
  const entries = registry.list().map(normalizeEntry);
  const backendGenerators = registry
    .filter({ type: "generator", category: "backend" })
    .map((entry) => entry.id);
  const backendWorkers = registry
    .filter({ type: "worker", category: "backend" })
    .map((entry) => entry.id);

  const preferredApiStyle = backendGenerators.includes("gen-trpc-router")
    ? "trpc"
    : "rest";

  return {
    entries,
    backendGenerators,
    backendWorkers,
    preferredApiStyle,
  };
}

export function createBackendFactoryInput(
  context: BuildContext,
  dna: PlatformBuildDna
): BackendFactoryInput {
  return {
    context,
    dna: normalizeBuildDna(dna),
    registry: normalizeBuildRegistry(),
  };
}
