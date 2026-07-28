import type { BackendFactoryInput, WorkerSpec } from "./types";

export function generateWorkerPlan(input: BackendFactoryInput): WorkerSpec[] {
  const registryWorkers = input.registry.backendWorkers;

  const plannedWorkers: WorkerSpec[] = [
    {
      id: "worker-telemetry-sync",
      name: "TelemetrySyncWorker",
      purpose: "Pull vehicle telemetry from external GPS/telematics providers.",
      triggers: ["cron:*/15 * * * *", "evt-vehicle-registered"],
      capabilities: ["telemetry-ingest", "provider-adapter"],
      status: "planned",
    },
    {
      id: "worker-fleet-alerts",
      name: "FleetAlertWorker",
      purpose: "Process fleet alert events and route notifications.",
      triggers: ["evt-fleet-alert-raised", "evt-vehicle-status-changed"],
      capabilities: ["alert-routing", "severity-escalation"],
      status: "planned",
    },
    {
      id: "worker-audit-log",
      name: "AuditLogWorker",
      purpose: "Persist security-relevant actions for compliance review.",
      triggers: ["evt-user-signed-in"],
      capabilities: ["audit-trail", "immutable-log"],
      status: "planned",
    },
  ];

  const registryLinked: WorkerSpec[] = registryWorkers.map((workerId) => {
    const entry = input.registry.entries.find((item) => item.id === workerId);
    return {
      id: `worker-registry-${workerId}`,
      name: entry?.name ?? workerId,
      registryWorkerId: workerId,
      purpose: `Registry-linked build worker for ${entry?.name ?? workerId}.`,
      triggers: ["build-pipeline"],
      capabilities: entry?.tags ?? ["build"],
      status: "registry-linked" as const,
    };
  });

  return [...plannedWorkers, ...registryLinked];
}
