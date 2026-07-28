/** Build Registry — unified factory (Epic 6.2). */

import { createBuildRegistry } from "./registry";
import { registerGenerators } from "./generator-registry";
import { registerProviders } from "./provider-registry";
import { registerArtifacts } from "./artifact-registry";
import { registerBuildWorkers } from "./worker-registry";
import { registerTemplates } from "./template-registry";
import { registerTechnologies } from "./technology-registry";
import type { BuildRegistry } from "./types";

export function createOfficialBuildRegistry(): BuildRegistry {
  const registry = createBuildRegistry();
  registerGenerators(registry);
  registerProviders(registry);
  registerArtifacts(registry);
  registerBuildWorkers(registry);
  registerTemplates(registry);
  registerTechnologies(registry);
  return registry;
}

export { createBuildRegistry, registerMany } from "./registry";
export type {
  BuildRegistry,
  RegistryEntry,
  RegistryQuery,
  RegistryStats,
  RegistryEntryType,
  RegistryEntryStatus,
  GeneratorCategory,
} from "./types";
