import type { EntitySpec, OptimizationSpec, DatabaseFactoryInput } from "./types";

export function generateOptimizationPlan(
  input: DatabaseFactoryInput,
  entities: EntitySpec[]
): OptimizationSpec[] {
  const optimizations: OptimizationSpec[] = [
    {
      id: "opt-connection-pooling",
      category: "connection",
      title: "Connection pooling",
      recommendation: `Use pooled connections for ${input.dna.databaseEngine}; cap pool size per serverless instance.`,
      impact: "high",
      priority: 1,
    },
    {
      id: "opt-tenant-filter",
      category: "query",
      title: "Tenant filter pushdown",
      recommendation: "Always include organization_id in WHERE clauses for tenant tables.",
      impact: "high",
      priority: 2,
    },
  ];

  const events = entities.find((entity) => entity.tableName === "events");
  if (events) {
    optimizations.push({
      id: "opt-events-partition",
      entityId: events.id,
      category: "partition",
      title: "Partition events by month",
      recommendation: "Range-partition events on occurred_at when volume exceeds 1M rows.",
      impact: input.dna.dataComplexity === "high" ? "high" : "medium",
      priority: 3,
    });
    optimizations.push({
      id: "opt-events-mv",
      entityId: events.id,
      category: "materialized_view",
      title: "Daily event aggregates",
      recommendation: "Materialized view for per-asset daily KPI rollups.",
      impact: "medium",
      priority: 4,
    });
  }

  const audit = entities.find((entity) => entity.tableName === "audit_logs");
  if (audit) {
    optimizations.push({
      id: "opt-audit-retention",
      entityId: audit.id,
      category: "query",
      title: "Audit retention policy",
      recommendation: "Archive audit_logs older than 90 days to cold storage.",
      impact: "medium",
      priority: 5,
    });
  }

  optimizations.push({
    id: "opt-covering-index",
    category: "index",
    title: "Covering indexes for dashboards",
    recommendation: "Add covering indexes on (organization_id, status, updated_at) for list endpoints.",
    impact: "medium",
    priority: 6,
  });

  return optimizations.sort((a, b) => a.priority - b.priority);
}
