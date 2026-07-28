import type {
  DatabaseBlueprint,
  DatabaseBlueprintValidation,
  DatabaseBlueprintValidationIssue,
  DatabaseFactoryInput,
} from "./types";

function issue(
  code: string,
  message: string,
  severity: DatabaseBlueprintValidationIssue["severity"] = "warning"
): DatabaseBlueprintValidationIssue {
  return { code, message, severity };
}

export function validateDatabaseFactoryInput(input: DatabaseFactoryInput): void {
  if (!input.context?.meta?.ventureId) {
    throw new Error("DatabaseFactoryInput.context.meta.ventureId is required");
  }

  if (!input.dna?.databaseEngine) {
    throw new Error("DatabaseFactoryInput.dna.databaseEngine is required");
  }

  if (!input.registry || !Array.isArray(input.registry.entries)) {
    throw new Error("DatabaseFactoryInput.registry.entries must be an array");
  }
}

export function validateDatabaseBlueprint(
  blueprint: Omit<DatabaseBlueprint, "validation">
): DatabaseBlueprintValidation {
  const issues: DatabaseBlueprintValidationIssue[] = [];

  if (blueprint.entities.length === 0) {
    issues.push(issue("ENTITIES_EMPTY", "No entities were generated", "error"));
  }

  if (blueprint.migrations.length === 0) {
    issues.push(issue("MIGRATIONS_EMPTY", "No migration specs were generated", "error"));
  }

  if (blueprint.policies.length === 0) {
    issues.push(issue("POLICIES_EMPTY", "No RLS/auth policies were generated", "error"));
  }

  if (!blueprint.entities.some((entity) => entity.tableName === "organizations")) {
    issues.push(issue("ORG_ENTITY_MISSING", "Organizations entity is recommended for multi-tenant apps"));
  }

  if (!blueprint.entities.some((entity) => entity.tableName === "users")) {
    issues.push(issue("USERS_ENTITY_MISSING", "Users entity is recommended"));
  }

  const entityIds = new Set(blueprint.entities.map((entity) => entity.id));
  for (const relation of blueprint.relations) {
    if (!entityIds.has(relation.fromEntityId) || !entityIds.has(relation.toEntityId)) {
      issues.push(
        issue(
          "RELATION_ORPHAN",
          `Relation ${relation.name} references missing entities`,
          "error"
        )
      );
    }
  }

  if (!blueprint.indexes.some((index) => index.columns.includes("organization_id"))) {
    issues.push(issue("TENANT_INDEX_MISSING", "Tenant-scoped index is recommended"));
  }

  if (blueprint.seeds.length === 0) {
    issues.push(issue("SEEDS_EMPTY", "No seed specs were generated"));
  }

  return {
    valid: issues.every((current) => current.severity !== "error"),
    issues,
  };
}
