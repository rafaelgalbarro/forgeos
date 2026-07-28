import type { BuildContext } from "@/lib/build-platform/build-context/types";

export type DatabasePlanStatus = "draft" | "ready";
export type ColumnType =
  | "uuid"
  | "text"
  | "varchar"
  | "integer"
  | "bigint"
  | "boolean"
  | "timestamptz"
  | "jsonb"
  | "numeric"
  | "date";

export type RelationKind = "one-to-one" | "one-to-many" | "many-to-many";
export type PolicyAction = "select" | "insert" | "update" | "delete" | "all";
export type MigrationDirection = "up" | "down";

export interface DatabaseFactoryInput {
  context: BuildContext;
  dna: BuildDna;
  registry: BuildRegistry;
}

export interface DatabaseBlueprintMeta {
  ventureId: string;
  ventureName: string;
  generatedAt: string;
  version: string;
  status: DatabasePlanStatus;
  databaseEngine: string;
  authProvider: string;
}

export interface ColumnSpec {
  id: string;
  name: string;
  type: ColumnType;
  nullable: boolean;
  primaryKey?: boolean;
  unique?: boolean;
  defaultValue?: string;
  description: string;
}

export interface EntitySpec {
  id: string;
  tableName: string;
  label: string;
  description: string;
  columns: ColumnSpec[];
  rlsEnabled: boolean;
  tags: string[];
}

export interface RelationSpec {
  id: string;
  name: string;
  kind: RelationKind;
  fromEntityId: string;
  toEntityId: string;
  fromColumn: string;
  toColumn: string;
  onDelete: "cascade" | "restrict" | "set null";
  description: string;
}

export interface IndexSpec {
  id: string;
  entityId: string;
  name: string;
  columns: string[];
  unique: boolean;
  method: "btree" | "gin" | "gist";
  rationale: string;
}

export interface PolicySpec {
  id: string;
  entityId: string;
  name: string;
  action: PolicyAction;
  role: "anon" | "authenticated" | "service_role" | "custom";
  expression: string;
  checkExpression?: string;
  description: string;
}

export interface MigrationStepSpec {
  order: number;
  sql: string;
  description: string;
}

export interface MigrationSpec {
  id: string;
  version: string;
  name: string;
  direction: MigrationDirection;
  steps: MigrationStepSpec[];
  dependsOn?: string[];
}

export interface SeedRecordSpec {
  entityId: string;
  tableName: string;
  records: Record<string, string | number | boolean>[];
}

export interface SeedSpec {
  id: string;
  name: string;
  environment: "development" | "staging" | "demo";
  records: SeedRecordSpec[];
  rationale: string;
}

export interface ConstraintSpec {
  id: string;
  entityId: string;
  name: string;
  kind: "primary_key" | "foreign_key" | "unique" | "check" | "not_null";
  columns: string[];
  expression?: string;
  referencedEntityId?: string;
  referencedColumns?: string[];
  description: string;
}

export interface OptimizationSpec {
  id: string;
  entityId?: string;
  category: "index" | "partition" | "materialized_view" | "query" | "connection";
  title: string;
  recommendation: string;
  impact: "low" | "medium" | "high";
  priority: number;
}

export interface DatabaseBlueprintValidationIssue {
  code: string;
  message: string;
  severity: "warning" | "error";
}

export interface DatabaseBlueprintValidation {
  valid: boolean;
  issues: DatabaseBlueprintValidationIssue[];
}

export interface DatabaseBlueprint {
  meta: DatabaseBlueprintMeta;
  entities: EntitySpec[];
  relations: RelationSpec[];
  indexes: IndexSpec[];
  policies: PolicySpec[];
  migrations: MigrationSpec[];
  seeds: SeedSpec[];
  constraints: ConstraintSpec[];
  optimization: OptimizationSpec[];
  validation: DatabaseBlueprintValidation;
}

export interface BuildDna {
  productType: string;
  primaryPersona: string;
  dataComplexity: "low" | "medium" | "high";
  databaseEngine: string;
  authProvider: string;
  multiTenant: boolean;
  modules: string[];
}

export interface BuildRegistryEntry {
  id: string;
  name: string;
  category: "entity" | "migration" | "policy" | "seed";
  tags: string[];
}

export interface BuildRegistry {
  entries: BuildRegistryEntry[];
  requiredEntities: string[];
  preferredIndexes: string[];
}
