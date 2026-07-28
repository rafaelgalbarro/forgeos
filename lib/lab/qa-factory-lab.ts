import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import {
  createQaFactory,
  createQaFactoryInput,
  type QaBlueprint,
} from "@/lib/build-platform/qa-factory";
import { createLabMockVenture } from "@/lib/lab/mock-venture";

export function generateQaFactoryLabBlueprint(): QaBlueprint {
  const venture = createLabMockVenture();
  const context = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  const dna = createBuildDnaFromContext(context);
  const input = createQaFactoryInput(context, dna);
  const factory = createQaFactory();
  return factory.generateBlueprint(input);
}
