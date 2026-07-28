import type { EntitySpec, RelationSpec, DatabaseFactoryInput } from "./types";

export function generateRelationPlan(
  input: DatabaseFactoryInput,
  entities: EntitySpec[]
): RelationSpec[] {
  const byTable = new Map(entities.map((entity) => [entity.tableName, entity]));
  const relations: RelationSpec[] = [];

  const org = byTable.get("organizations");
  const users = byTable.get("users");
  const audit = byTable.get("audit_logs");
  const assets = byTable.get("assets");
  const events = byTable.get("events");

  if (org && users) {
    relations.push({
      id: "rel-users-org",
      name: "users_organization",
      kind: "one-to-many",
      fromEntityId: users.id,
      toEntityId: org.id,
      fromColumn: "organization_id",
      toColumn: "id",
      onDelete: "cascade",
      description: "Users belong to an organization.",
    });
  }

  if (org && audit) {
    relations.push({
      id: "rel-audit-org",
      name: "audit_logs_organization",
      kind: "one-to-many",
      fromEntityId: audit.id,
      toEntityId: org.id,
      fromColumn: "organization_id",
      toColumn: "id",
      onDelete: "cascade",
      description: "Audit logs are scoped per organization.",
    });
  }

  if (users && audit) {
    relations.push({
      id: "rel-audit-actor",
      name: "audit_logs_actor",
      kind: "one-to-many",
      fromEntityId: audit.id,
      toEntityId: users.id,
      fromColumn: "actor_id",
      toColumn: "id",
      onDelete: "set null",
      description: "Optional actor reference for audit events.",
    });
  }

  if (org && assets) {
    relations.push({
      id: "rel-assets-org",
      name: "assets_organization",
      kind: "one-to-many",
      fromEntityId: assets.id,
      toEntityId: org.id,
      fromColumn: "organization_id",
      toColumn: "id",
      onDelete: "cascade",
      description: "Assets are owned by an organization.",
    });
  }

  if (assets && events) {
    relations.push({
      id: "rel-events-asset",
      name: "events_asset",
      kind: "one-to-many",
      fromEntityId: events.id,
      toEntityId: assets.id,
      fromColumn: "asset_id",
      toColumn: "id",
      onDelete: "cascade",
      description: "Events reference a parent asset.",
    });
  }

  if (org && events) {
    relations.push({
      id: "rel-events-org",
      name: "events_organization",
      kind: "one-to-many",
      fromEntityId: events.id,
      toEntityId: org.id,
      fromColumn: "organization_id",
      toColumn: "id",
      onDelete: "cascade",
      description: "Events are tenant-scoped.",
    });
  }

  const registryEntities = entities.filter((entity) => entity.tags.includes("registry"));
  for (const entity of registryEntities) {
    if (!org) continue;
    relations.push({
      id: `rel-${entity.tableName}-org`,
      name: `${entity.tableName}_organization`,
      kind: "one-to-many",
      fromEntityId: entity.id,
      toEntityId: org.id,
      fromColumn: "organization_id",
      toColumn: "id",
      onDelete: "cascade",
      description: `Registry entity ${entity.label} scoped to organization.`,
    });
  }

  if (input.dna.dataComplexity === "high" && users && assets) {
    relations.push({
      id: "rel-assets-owner",
      name: "assets_owner",
      kind: "one-to-many",
      fromEntityId: assets.id,
      toEntityId: users.id,
      fromColumn: "owner_id",
      toColumn: "id",
      onDelete: "set null",
      description: "Optional asset owner for high-complexity ventures.",
    });
  }

  return relations;
}
