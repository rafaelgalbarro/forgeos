import { generateConstraintPlan } from "./constraint-generator";
import { generateMigrationPlan } from "./migration-generator";
import { generateEntityPlan } from "./entity-generator";
import { generateIndexPlan } from "./index-generator";
import { generateOptimizationPlan } from "./optimization-generator";
import { generatePolicyPlan } from "./policy-generator";
import { generateRelationPlan } from "./relation-generator";
import { generateSeedPlan } from "./seed-generator";
import type { DatabaseBlueprint, DatabaseFactoryInput } from "./types";

export function buildDatabaseBlueprint(
  input: DatabaseFactoryInput
): Omit<DatabaseBlueprint, "validation"> {
  const entities = generateEntityPlan(input);
  const relations = generateRelationPlan(input, entities);
  const indexes = generateIndexPlan(input, entities);
  const policies = generatePolicyPlan(input, entities);
  const migrations = generateMigrationPlan(entities, relations, indexes);
  const seeds = generateSeedPlan(input, entities);
  const constraints = generateConstraintPlan(entities, relations);
  const optimization = generateOptimizationPlan(input, entities);

  return {
    meta: {
      ventureId: input.context.meta.ventureId,
      ventureName: input.context.meta.ventureName,
      generatedAt: new Date().toISOString(),
      version: "6.5.0",
      status: "draft",
      databaseEngine: input.dna.databaseEngine,
      authProvider: input.dna.authProvider,
    },
    entities,
    relations,
    indexes,
    policies,
    migrations,
    seeds,
    constraints,
    optimization,
  };
}
