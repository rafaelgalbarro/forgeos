import type { BackendFactoryInput, JobSpec } from "./types";

export function generateJobPlan(input: BackendFactoryInput): JobSpec[] {
  return [
    {
      id: "job-sync-telemetry",
      name: "SyncVehicleTelemetry",
      queue: "fleet-telemetry",
      schedule: "*/15 * * * *",
      trigger: "cron",
      handler: "worker-telemetry-sync",
      retryPolicy: "exponential-backoff:3",
    },
    {
      id: "job-fleet-alerts",
      name: "ProcessFleetAlerts",
      queue: "fleet-alerts",
      trigger: "event",
      handler: "worker-fleet-alerts",
      retryPolicy: "fixed-delay:5s:5",
    },
    {
      id: "job-notify-operators",
      name: "NotifyFleetOperators",
      queue: "notifications",
      trigger: "event",
      handler: "NotificationService.sendAlert",
      retryPolicy: "exponential-backoff:5",
    },
    {
      id: "job-audit-log",
      name: "PersistAuditLog",
      queue: "audit",
      trigger: "event",
      handler: "worker-audit-log",
      retryPolicy: "none",
    },
    {
      id: "job-nightly-metrics",
      name: "NightlyMetricsRollup",
      queue: "analytics",
      schedule: "0 2 * * *",
      trigger: "cron",
      handler: "svc-fleet-metrics.aggregateMetrics",
      retryPolicy: "exponential-backoff:2",
    },
    {
      id: "job-session-cleanup",
      name: "ExpiredSessionCleanup",
      queue: "maintenance",
      schedule: "0 */6 * * *",
      trigger: "cron",
      handler: "svc-auth.revokeSession",
      retryPolicy: "fixed-delay:30s:3",
    },
    ...(input.dna.complexity === "high"
      ? [
          {
            id: "job-integration-reconcile",
            name: "IntegrationReconcile",
            queue: "integrations",
            schedule: "0 */1 * * *",
            trigger: "cron" as const,
            handler: "svc-integrations.reconcile",
            retryPolicy: "exponential-backoff:4",
          },
        ]
      : []),
  ];
}
