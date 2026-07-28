import type { EntitySpec, SeedSpec, DatabaseFactoryInput } from "./types";

export function generateSeedPlan(
  input: DatabaseFactoryInput,
  entities: EntitySpec[]
): SeedSpec[] {
  const org = entities.find((entity) => entity.tableName === "organizations");
  const users = entities.find((entity) => entity.tableName === "users");
  const assets = entities.find((entity) => entity.tableName === "assets");

  const demoOrgId = "00000000-0000-4000-8000-000000000001";
  const demoUserId = "00000000-0000-4000-8000-000000000002";
  const demoAssetId = "00000000-0000-4000-8000-000000000003";

  const records = [];

  if (org) {
    records.push({
      entityId: org.id,
      tableName: org.tableName,
      records: [
        {
          id: demoOrgId,
          name: `${input.context.meta.ventureName} Demo Org`,
          slug: "demo-org",
          plan_tier: "starter",
        },
      ],
    });
  }

  if (users) {
    records.push({
      entityId: users.id,
      tableName: users.tableName,
      records: [
        {
          id: demoUserId,
          organization_id: demoOrgId,
          email: "demo@forgeos.lab",
          role: "admin",
        },
      ],
    });
  }

  if (assets) {
    records.push({
      entityId: assets.id,
      tableName: assets.tableName,
      records: [
        {
          id: demoAssetId,
          organization_id: demoOrgId,
          name: "Demo Asset 01",
          status: "active",
        },
      ],
    });
  }

  return [
    {
      id: "seed-demo-tenant",
      name: "demo_tenant_bootstrap",
      environment: "development",
      records,
      rationale: `Bootstrap demo tenant for ${input.context.meta.ventureName} lab and local development.`,
    },
    {
      id: "seed-staging-minimal",
      name: "staging_minimal",
      environment: "staging",
      records: org
        ? [
            {
              entityId: org.id,
              tableName: org.tableName,
              records: [{ id: demoOrgId, name: "Staging Org", slug: "staging-org", plan_tier: "pro" }],
            },
          ]
        : [],
      rationale: "Minimal staging seed for smoke tests.",
    },
  ];
}
