import type { EntitySpec, IndexSpec, MigrationSpec, RelationSpec } from "./types";

function columnDef(column: EntitySpec["columns"][number]): string {
  const parts = [`${column.name} ${column.type.toUpperCase()}`];
  if (!column.nullable) parts.push("NOT NULL");
  if (column.unique) parts.push("UNIQUE");
  if (column.defaultValue) parts.push(`DEFAULT ${column.defaultValue}`);
  return parts.join(" ");
}

export function generateMigrationPlan(
  entities: EntitySpec[],
  relations: RelationSpec[],
  indexes: IndexSpec[]
): MigrationSpec[] {
  const createTableSteps = entities.map((entity, order) => ({
    order: order + 1,
    sql: `CREATE TABLE ${entity.tableName} (\n  ${entity.columns.map(columnDef).join(",\n  ")}\n);`,
    description: `Create table ${entity.tableName}`,
  }));

  const rlsSteps = entities
    .filter((entity) => entity.rlsEnabled)
    .map((entity, index) => ({
      order: createTableSteps.length + index + 1,
      sql: `ALTER TABLE ${entity.tableName} ENABLE ROW LEVEL SECURITY;`,
      description: `Enable RLS on ${entity.tableName}`,
    }));

  const fkSteps = relations.map((relation, index) => {
    const from = entities.find((entity) => entity.id === relation.fromEntityId);
    const to = entities.find((entity) => entity.id === relation.toEntityId);
    if (!from || !to) {
      return {
        order: createTableSteps.length + rlsSteps.length + index + 1,
        sql: `-- skipped: missing entity for ${relation.name}`,
        description: `Skipped FK ${relation.name}`,
      };
    }

    return {
      order: createTableSteps.length + rlsSteps.length + index + 1,
      sql: `ALTER TABLE ${from.tableName}\n  ADD CONSTRAINT fk_${relation.name}\n  FOREIGN KEY (${relation.fromColumn}) REFERENCES ${to.tableName}(${relation.toColumn})\n  ON DELETE ${relation.onDelete.toUpperCase().replace(" ", " ")};`,
      description: `Add FK ${relation.name}`,
    };
  });

  const indexSteps = indexes.map((indexSpec, index) => {
    const entity = entities.find((current) => current.id === indexSpec.entityId);
    const unique = indexSpec.unique ? "UNIQUE " : "";
    const method = indexSpec.method !== "btree" ? ` USING ${indexSpec.method}` : "";
    return {
      order: createTableSteps.length + rlsSteps.length + fkSteps.length + index + 1,
      sql: `CREATE ${unique}INDEX ${indexSpec.name} ON ${entity?.tableName ?? "unknown"}${method} (${indexSpec.columns.join(", ")});`,
      description: `Create index ${indexSpec.name}`,
    };
  });

  const upSteps = [...createTableSteps, ...rlsSteps, ...fkSteps, ...indexSteps];

  const downSteps = [
    ...indexes
      .slice()
      .reverse()
      .map((indexSpec, index) => ({
        order: index + 1,
        sql: `DROP INDEX IF EXISTS ${indexSpec.name};`,
        description: `Drop index ${indexSpec.name}`,
      })),
    ...relations
      .slice()
      .reverse()
      .map((relation, index) => ({
        order: indexes.length + index + 1,
        sql: `ALTER TABLE ${entities.find((entity) => entity.id === relation.fromEntityId)?.tableName ?? "unknown"} DROP CONSTRAINT IF EXISTS fk_${relation.name};`,
        description: `Drop FK ${relation.name}`,
      })),
    ...entities
      .slice()
      .reverse()
      .map((entity, index) => ({
        order: indexes.length + relations.length + index + 1,
        sql: `DROP TABLE IF EXISTS ${entity.tableName};`,
        description: `Drop table ${entity.tableName}`,
      })),
  ];

  return [
    {
      id: "migration-initial-schema",
      version: "001",
      name: "initial_schema",
      direction: "up",
      steps: upSteps,
    },
    {
      id: "migration-initial-schema-down",
      version: "001",
      name: "initial_schema_rollback",
      direction: "down",
      steps: downSteps,
      dependsOn: ["migration-initial-schema"],
    },
  ];
}

