import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import {
  createBackendFactory,
  createBackendFactoryInput,
  type BackendBlueprint,
} from "@/lib/build-platform/backend-factory";
import { createLabMockVenture } from "@/lib/lab/mock-venture";

export function generateBackendFactoryLabBlueprint(): BackendBlueprint {
  const venture = createLabMockVenture();
  const context = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  const dna = createBuildDnaFromContext(context);
  const input = createBackendFactoryInput(context, dna);
  const factory = createBackendFactory();
  return factory.generateBlueprint(input);
}
