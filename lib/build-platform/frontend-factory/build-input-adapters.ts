import type { BuildDna as PlatformBuildDna } from "@/lib/build-platform/build-dna";
import { createOfficialBuildRegistry } from "@/lib/build-platform/build-registry";
import type { BuildContext } from "@/lib/build-platform/build-context";
import type { RegistryEntry } from "@/lib/build-platform/build-registry";
import type {
  BuildDna,
  BuildRegistry,
  BuildRegistryEntry,
  FrontendFactoryInput,
} from "./types";

function normalizeBuildDna(dna: PlatformBuildDna): BuildDna {
  return {
    productType: dna.stack.frontend || dna.stack.framework || "web-app",
    primaryPersona: "operator",
    uiTone: "neutral",
    complexity: dna.meta.completenessScore >= 80 ? "high" : dna.meta.completenessScore >= 50 ? "medium" : "low",
    preferredNavigation: "sidebar",
    modules: ["overview", "operations", "settings"],
  };
}

function normalizeEntry(
  entry: RegistryEntry
): BuildRegistryEntry {
  const category = entry.type === "generator"
    ? "page"
    : entry.type === "artifact"
      ? "widget"
      : entry.type === "template"
        ? "form"
        : entry.type === "worker"
          ? "dashboard"
          : "page";

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
    preferredWidgets: entries.filter((entry) => entry.category === "widget").slice(0, 3).map((entry) => entry.id),
    requiredRoutes: ["/operations", "/settings", "/reports"],
  };
}

export function createFrontendFactoryInput(
  context: BuildContext,
  dna: PlatformBuildDna
): FrontendFactoryInput {
  return {
    context,
    dna: normalizeBuildDna(dna),
    registry: normalizeBuildRegistry(),
  };
}
