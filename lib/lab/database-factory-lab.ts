import { buildBuildContextFromVenture } from "@/lib/build-platform/build-context";
import { createBuildDnaFromContext } from "@/lib/build-platform/build-dna";
import {
  createDatabaseFactory,
  createDatabaseFactoryInput,
  type DatabaseBlueprint,
} from "@/lib/build-platform/database-factory";
import { createLabMockVenture } from "@/lib/lab/mock-venture";

export function generateDatabaseFactoryLabBlueprint(): DatabaseBlueprint {
  const venture = createLabMockVenture();
  const context = buildBuildContextFromVenture(venture, { persist: false, recordHistory: false });
  const dna = createBuildDnaFromContext(context);
  const input = createDatabaseFactoryInput(context, dna);
  const factory = createDatabaseFactory();
  return factory.generateBlueprint(input);
}
