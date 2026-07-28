import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import {
  createFrontendFactory,
  createFrontendFactoryInput,
  type FrontendBlueprint,
} from "@/lib/build-platform/frontend-factory";
import { createLabMockVenture } from "@/lib/lab/mock-venture";

export function generateFrontendFactoryLabBlueprint(): FrontendBlueprint {
  const venture = createLabMockVenture();
  const context = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  const dna = createBuildDnaFromContext(context);
  const input = createFrontendFactoryInput(context, dna);
  const factory = createFrontendFactory();
  return factory.generateBlueprint(input);
}
