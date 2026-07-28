import type { EntitySpec, PolicySpec, DatabaseFactoryInput } from "./types";

export function generatePolicyPlan(
  input: DatabaseFactoryInput,
  entities: EntitySpec[]
): PolicySpec[] {
  const policies: PolicySpec[] = [];
  const tenantExpression =
    "organization_id IN (SELECT organization_id FROM users WHERE id = auth.uid())";

  for (const entity of entities.filter((current) => current.rlsEnabled)) {
    policies.push({
      id: `policy-${entity.tableName}-select`,
      entityId: entity.id,
      name: `${entity.tableName}_select_tenant`,
      action: "select",
      role: "authenticated",
      expression: tenantExpression,
      description: `Authenticated users read ${entity.label} within their tenant.`,
    });

    if (entity.tableName !== "audit_logs") {
      policies.push({
        id: `policy-${entity.tableName}-insert`,
        entityId: entity.id,
        name: `${entity.tableName}_insert_tenant`,
        action: "insert",
        role: "authenticated",
        expression: tenantExpression,
        checkExpression: tenantExpression,
        description: `Authenticated users insert ${entity.label} within their tenant.`,
      });

      policies.push({
        id: `policy-${entity.tableName}-update`,
        entityId: entity.id,
        name: `${entity.tableName}_update_tenant`,
        action: "update",
        role: "authenticated",
        expression: tenantExpression,
        checkExpression: tenantExpression,
        description: `Authenticated users update ${entity.label} within their tenant.`,
      });
    }

    if (entity.tableName === "organizations") {
      policies.push({
        id: "policy-organizations-select-anon",
        entityId: entity.id,
        name: "organizations_select_public_slug",
        action: "select",
        role: "anon",
        expression: "slug IS NOT NULL",
        description: "Allow public slug lookup for onboarding.",
      });
    }
  }

  if (input.dna.authProvider.toLowerCase().includes("supabase")) {
    policies.push({
      id: "policy-service-role-bypass",
      entityId: entities[0]?.id ?? "entity-organizations",
      name: "service_role_full_access",
      action: "all",
      role: "service_role",
      expression: "true",
      description: "Service role bypass for server-side operations (spec only).",
    });
  }

  return policies;
}
