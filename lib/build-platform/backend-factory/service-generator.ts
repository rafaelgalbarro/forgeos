import type { BackendFactoryInput, ServiceSpec } from "./types";

export function generateServicePlan(input: BackendFactoryInput): ServiceSpec[] {
  const baseServices: ServiceSpec[] = [
    {
      id: "svc-health",
      name: "HealthService",
      domain: "platform",
      responsibility: "Expose health and readiness signals for observability.",
      methods: [
        {
          id: "health-check",
          name: "check",
          purpose: "Return service liveness status.",
          repositoryIds: [],
          eventIds: [],
        },
      ],
      dependencies: [],
    },
    {
      id: "svc-auth",
      name: "AuthService",
      domain: "identity",
      responsibility: `Authenticate users via ${input.dna.authProvider} and issue scoped sessions.`,
      methods: [
        {
          id: "auth-create-session",
          name: "createSession",
          purpose: "Validate provider token and create application session.",
          repositoryIds: ["repo-user"],
          eventIds: ["evt-user-signed-in"],
        },
        {
          id: "auth-revoke-session",
          name: "revokeSession",
          purpose: "Invalidate active session and clear credentials.",
          repositoryIds: ["repo-user"],
          eventIds: [],
        },
      ],
      dependencies: ["svc-permissions"],
    },
    {
      id: "svc-vehicle",
      name: "VehicleService",
      domain: "fleet",
      responsibility: "Manage vehicle lifecycle, status, and telemetry ingestion.",
      methods: [
        {
          id: "vehicle-list",
          name: "listVehicles",
          purpose: "Query vehicles with filters and pagination.",
          repositoryIds: ["repo-vehicle"],
          eventIds: [],
        },
        {
          id: "vehicle-create",
          name: "createVehicle",
          purpose: "Register a new vehicle and emit domain event.",
          repositoryIds: ["repo-vehicle"],
          eventIds: ["evt-vehicle-registered"],
        },
        {
          id: "vehicle-update-status",
          name: "updateStatus",
          purpose: "Update vehicle operational status from telemetry or manual input.",
          repositoryIds: ["repo-vehicle"],
          eventIds: ["evt-vehicle-status-changed"],
        },
      ],
      dependencies: ["repo-vehicle"],
    },
    {
      id: "svc-fleet-metrics",
      name: "FleetMetricsService",
      domain: "analytics",
      responsibility: "Compute fleet-wide KPIs and alert thresholds.",
      methods: [
        {
          id: "metrics-aggregate",
          name: "aggregateMetrics",
          purpose: "Roll up vehicle telemetry into fleet dashboard metrics.",
          repositoryIds: ["repo-vehicle", "repo-fleet"],
          eventIds: [],
        },
        {
          id: "metrics-detect-alerts",
          name: "detectAlerts",
          purpose: "Evaluate alert rules and emit fleet alert events.",
          repositoryIds: ["repo-fleet"],
          eventIds: ["evt-fleet-alert-raised"],
        },
      ],
      dependencies: ["svc-vehicle"],
    },
    {
      id: "svc-permissions",
      name: "PermissionService",
      domain: "security",
      responsibility: "Resolve role-based access for API and service operations.",
      methods: [
        {
          id: "permissions-resolve",
          name: "resolvePermissions",
          purpose: "Map user role to allowed actions on resources.",
          repositoryIds: ["repo-user"],
          eventIds: [],
        },
      ],
      dependencies: [],
    },
  ];

  const moduleServices: ServiceSpec[] = input.dna.modules
    .filter((module) => module !== "core")
    .map((module) => ({
      id: `svc-${module}`,
      name: `${capitalize(module)}Service`,
      domain: module,
      responsibility: `Domain service for ${module} module operations.`,
      methods: [
        {
          id: `${module}-overview`,
          name: "getOverview",
          purpose: `Return ${module} module summary for workspace surfaces.`,
          repositoryIds: [`repo-${module}`],
          eventIds: [],
        },
      ],
      dependencies: [],
    }));

  return [...baseServices, ...moduleServices];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
