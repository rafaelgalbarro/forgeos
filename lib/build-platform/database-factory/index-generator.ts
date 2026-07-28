import type { EntitySpec, IndexSpec, DatabaseFactoryInput } from "./types";

export function generateIndexPlan(
  input: DatabaseFactoryInput,
  entities: EntitySpec[]
): IndexSpec[] {
  const indexes: IndexSpec[] = [];

  for (const entity of entities) {
    const orgColumn = entity.columns.find((col) => col.name === "organization_id");
    if (orgColumn) {
      indexes.push({
        id: `idx-${entity.tableName}-org`,
        entityId: entity.id,
        name: `idx_${entity.tableName}_organization_id`,
        columns: ["organization_id"],
        unique: false,
        method: "btree",
        rationale: "Tenant-scoped queries filter by organization_id.",
      });
    }

    const uniqueColumns = entity.columns.filter((col) => col.unique);
    for (const column of uniqueColumns) {
      indexes.push({
        id: `idx-${entity.tableName}-${column.name}-unique`,
        entityId: entity.id,
        name: `idx_${entity.tableName}_${column.name}_unique`,
        columns: [column.name],
        unique: true,
        method: "btree",
        rationale: `Enforce uniqueness on ${column.name}.`,
      });
    }
  }

  const events = entities.find((entity) => entity.tableName === "events");
  if (events) {
    indexes.push({
      id: "idx-events-occurred",
      entityId: events.id,
      name: "idx_events_occurred_at",
      columns: ["organization_id", "occurred_at"],
      unique: false,
      method: "btree",
      rationale: "Time-range queries on operational events.",
    });
    indexes.push({
      id: "idx-events-data-gin",
      entityId: events.id,
      name: "idx_events_data_gin",
      columns: ["data"],
      unique: false,
      method: "gin",
      rationale: "JSONB containment queries on event payloads.",
    });
  }

  const audit = entities.find((entity) => entity.tableName === "audit_logs");
  if (audit) {
    indexes.push({
      id: "idx-audit-created",
      entityId: audit.id,
      name: "idx_audit_logs_created_at",
      columns: ["organization_id", "created_at"],
      unique: false,
      method: "btree",
      rationale: input.registry.preferredIndexes.includes("idx_audit_created")
        ? "Registry-preferred audit timeline index."
        : "Audit log chronological retrieval.",
    });
  }

  const users = entities.find((entity) => entity.tableName === "users");
  if (users) {
    indexes.push({
      id: "idx-users-org",
      entityId: users.id,
      name: "idx_users_organization_id",
      columns: ["organization_id", "email"],
      unique: false,
      method: "btree",
      rationale: "Lookup users within a tenant.",
    });
  }

  return indexes;
}
