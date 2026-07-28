import type { ConstraintSpec, EntitySpec, RelationSpec } from "./types";

export function generateConstraintPlan(
  entities: EntitySpec[],
  relations: RelationSpec[]
): ConstraintSpec[] {
  const constraints: ConstraintSpec[] = [];

  for (const entity of entities) {
    const pkColumns = entity.columns.filter((col) => col.primaryKey).map((col) => col.name);
    if (pkColumns.length) {
      constraints.push({
        id: `constraint-${entity.tableName}-pk`,
        entityId: entity.id,
        name: `pk_${entity.tableName}`,
        kind: "primary_key",
        columns: pkColumns,
        description: `Primary key on ${entity.tableName}.`,
      });
    }

    for (const column of entity.columns.filter((col) => col.unique && !col.primaryKey)) {
      constraints.push({
        id: `constraint-${entity.tableName}-${column.name}-unique`,
        entityId: entity.id,
        name: `uq_${entity.tableName}_${column.name}`,
        kind: "unique",
        columns: [column.name],
        description: `Unique constraint on ${column.name}.`,
      });
    }

    for (const column of entity.columns.filter((col) => !col.nullable && !col.primaryKey)) {
      constraints.push({
        id: `constraint-${entity.tableName}-${column.name}-not-null`,
        entityId: entity.id,
        name: `nn_${entity.tableName}_${column.name}`,
        kind: "not_null",
        columns: [column.name],
        description: `NOT NULL on ${column.name}.`,
      });
    }
  }

  for (const relation of relations) {
    const from = entities.find((entity) => entity.id === relation.fromEntityId);
    const to = entities.find((entity) => entity.id === relation.toEntityId);
    if (!from || !to) continue;

    constraints.push({
      id: `constraint-${relation.name}-fk`,
      entityId: from.id,
      name: `fk_${relation.name}`,
      kind: "foreign_key",
      columns: [relation.fromColumn],
      referencedEntityId: to.id,
      referencedColumns: [relation.toColumn],
      description: relation.description,
    });
  }

  return constraints;
}
