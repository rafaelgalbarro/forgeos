import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import {
  createInfrastructureFactory,
  createInfraFactoryInput,
  type InfraBlueprint,
} from "@/lib/build-platform/infrastructure-factory";
import { createLabMockVenture } from "@/lib/lab/mock-venture";

export function generateInfrastructureFactoryLabBlueprint(): InfraBlueprint {
  const venture = createLabMockVenture();
  const context = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  const dna = createBuildDnaFromContext(context);
  const input = createInfraFactoryInput(context, dna);
  const factory = createInfrastructureFactory();
  return factory.generateBlueprint(input);
}
