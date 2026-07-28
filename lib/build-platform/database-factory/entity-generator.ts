import type { EntitySpec, DatabaseFactoryInput } from "./types";

function baseColumns(): EntitySpec["columns"] {
  return [
    {
      id: "col-id",
      name: "id",
      type: "uuid",
      nullable: false,
      primaryKey: true,
      defaultValue: "gen_random_uuid()",
      description: "Primary key",
    },
    {
      id: "col-created",
      name: "created_at",
      type: "timestamptz",
      nullable: false,
      defaultValue: "now()",
      description: "Record creation timestamp",
    },
    {
      id: "col-updated",
      name: "updated_at",
      type: "timestamptz",
      nullable: false,
      defaultValue: "now()",
      description: "Record update timestamp",
    },
  ];
}

export function generateEntityPlan(input: DatabaseFactoryInput): EntitySpec[] {
  const venture = input.context.meta.ventureName;
  const multiTenant = input.dna.multiTenant;

  const coreEntities: EntitySpec[] = [
    {
      id: "entity-organizations",
      tableName: "organizations",
      label: "Organizations",
      description: `Tenant root for ${venture}.`,
      columns: [
        ...baseColumns(),
        {
          id: "col-org-name",
          name: "name",
          type: "varchar",
          nullable: false,
          description: "Organization display name",
        },
        {
          id: "col-org-slug",
          name: "slug",
          type: "varchar",
          nullable: false,
          unique: true,
          description: "URL-safe organization identifier",
        },
        {
          id: "col-org-plan",
          name: "plan_tier",
          type: "varchar",
          nullable: false,
          defaultValue: "'starter'",
          description: "Subscription plan tier",
        },
      ],
      rlsEnabled: multiTenant,
      tags: ["core", "tenant"],
    },
    {
      id: "entity-users",
      tableName: "users",
      label: "Users",
      description: "Application users linked to auth provider.",
      columns: [
        ...baseColumns(),
        {
          id: "col-user-org",
          name: "organization_id",
          type: "uuid",
          nullable: false,
          description: "Owning organization",
        },
        {
          id: "col-user-email",
          name: "email",
          type: "varchar",
          nullable: false,
          unique: true,
          description: "User email address",
        },
        {
          id: "col-user-role",
          name: "role",
          type: "varchar",
          nullable: false,
          defaultValue: "'member'",
          description: "Application role",
        },
      ],
      rlsEnabled: true,
      tags: ["core", "auth"],
    },
    {
      id: "entity-audit-logs",
      tableName: "audit_logs",
      label: "Audit Logs",
      description: "Immutable audit trail for sensitive operations.",
      columns: [
        ...baseColumns(),
        {
          id: "col-audit-org",
          name: "organization_id",
          type: "uuid",
          nullable: false,
          description: "Tenant scope",
        },
        {
          id: "col-audit-actor",
          name: "actor_id",
          type: "uuid",
          nullable: true,
          description: "User who performed the action",
        },
        {
          id: "col-audit-action",
          name: "action",
          type: "varchar",
          nullable: false,
          description: "Action identifier",
        },
        {
          id: "col-audit-payload",
          name: "payload",
          type: "jsonb",
          nullable: true,
          description: "Structured event payload",
        },
      ],
      rlsEnabled: true,
      tags: ["audit", "compliance"],
    },
  ];

  const domainEntities: EntitySpec[] = input.dna.modules.includes("operations")
    ? [
        {
          id: "entity-assets",
          tableName: "assets",
          label: "Assets",
          description: `Primary operational records for ${venture}.`,
          columns: [
            ...baseColumns(),
            {
              id: "col-asset-org",
              name: "organization_id",
              type: "uuid",
              nullable: false,
              description: "Tenant scope",
            },
            {
              id: "col-asset-name",
              name: "name",
              type: "varchar",
              nullable: false,
              description: "Asset display name",
            },
            {
              id: "col-asset-status",
              name: "status",
              type: "varchar",
              nullable: false,
              defaultValue: "'active'",
              description: "Operational status",
            },
            {
              id: "col-asset-meta",
              name: "metadata",
              type: "jsonb",
              nullable: true,
              description: "Flexible asset attributes",
            },
          ],
          rlsEnabled: true,
          tags: ["operations", "domain"],
        },
        {
          id: "entity-events",
          tableName: "events",
          label: "Events",
          description: "Time-series operational events linked to assets.",
          columns: [
            ...baseColumns(),
            {
              id: "col-event-org",
              name: "organization_id",
              type: "uuid",
              nullable: false,
              description: "Tenant scope",
            },
            {
              id: "col-event-asset",
              name: "asset_id",
              type: "uuid",
              nullable: false,
              description: "Related asset",
            },
            {
              id: "col-event-type",
              name: "event_type",
              type: "varchar",
              nullable: false,
              description: "Event classification",
            },
            {
              id: "col-event-occurred",
              name: "occurred_at",
              type: "timestamptz",
              nullable: false,
              defaultValue: "now()",
              description: "When the event occurred",
            },
            {
              id: "col-event-data",
              name: "data",
              type: "jsonb",
              nullable: true,
              description: "Event payload",
            },
          ],
          rlsEnabled: true,
          tags: ["operations", "telemetry"],
        },
      ]
    : [];

  const registryEntities = input.registry.entries
    .filter((entry) => entry.category === "entity")
    .slice(0, 2)
    .map<EntitySpec>((entry) => ({
      id: `entity-registry-${entry.id}`,
      tableName: entry.id.replace(/[^a-z0-9_]/gi, "_").toLowerCase(),
      label: entry.name,
      description: `Registry-driven entity for ${entry.name}.`,
      columns: [
        ...baseColumns(),
        {
          id: `col-${entry.id}-org`,
          name: "organization_id",
          type: "uuid",
          nullable: false,
          description: "Tenant scope",
        },
        {
          id: `col-${entry.id}-label`,
          name: "label",
          type: "varchar",
          nullable: false,
          description: "Display label",
        },
      ],
      rlsEnabled: true,
      tags: ["registry", ...entry.tags],
    }));

  return [...coreEntities, ...domainEntities, ...registryEntities];
}
