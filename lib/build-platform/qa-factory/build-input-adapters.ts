import type { BuildDna as PlatformBuildDna } from "@/lib/build-platform/build-dna";
import { createOfficialBuildRegistry } from "@/lib/build-platform/build-registry";
import type { BuildContext } from "@/lib/build-platform/build-context";
import type { RegistryEntry } from "@/lib/build-platform/build-registry";
import type {
  QaBuildDna,
  QaBuildRegistry,
  QaFactoryInput,
  QaRegistryEntry,
} from "./types";

function normalizeBuildDna(dna: PlatformBuildDna): QaBuildDna {
  const testing = dna.testing;
  return {
    productType: dna.stack.frontend || dna.stack.framework || "web-app",
    testingFramework: dna.stack.testing || "vitest",
    unitCoverageMin: testing.unitCoverageMin,
    integrationRequired: testing.integrationRequired,
    e2eRequired: testing.e2eRequired,
    complexity:
      dna.meta.completenessScore >= 80
        ? "high"
        : dna.meta.completenessScore >= 50
          ? "medium"
          : "low",
    modules: ["overview", "operations", "settings"],
    securityLevel: dna.security.oauthRequired ? "elevated" : "standard",
  };
}

function normalizeEntry(entry: RegistryEntry): QaRegistryEntry {
  const category: QaRegistryEntry["category"] =
    entry.type === "technology"
      ? "generator"
      : entry.type;

  return {
    id: entry.id,
    name: entry.name,
    category,
    tags: entry.tags ?? [],
  };
}

function normalizeBuildRegistry(): QaBuildRegistry {
  const registry = createOfficialBuildRegistry();
  const entries = registry.list().map(normalizeEntry);
  return {
    entries,
    testGenerators: entries
      .filter((entry) => entry.category === "generator")
      .slice(0, 4)
      .map((entry) => entry.id),
    requiredRoutes: ["/", "/dashboard", "/operations", "/settings"],
  };
}

export function createQaFactoryInput(
  context: BuildContext,
  dna: PlatformBuildDna
): QaFactoryInput {
  return {
    context,
    dna: normalizeBuildDna(dna),
    registry: normalizeBuildRegistry(),
  };
}
