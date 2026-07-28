import type { BackendFactoryInput, EventSpec } from "./types";

export function generateEventPlan(input: BackendFactoryInput): EventSpec[] {
  const ventureTopic = input.context.meta.ventureId.replace(/[^a-z0-9-]/gi, "-");

  return [
    {
      id: "evt-user-signed-in",
      name: "UserSignedIn",
      topic: `${ventureTopic}.identity.user-signed-in`,
      trigger: "AuthService.createSession succeeds",
      payloadFields: ["userId", "orgId", "role", "signedInAt"],
      consumers: ["svc-permissions", "job-audit-log"],
    },
    {
      id: "evt-vehicle-registered",
      name: "VehicleRegistered",
      topic: `${ventureTopic}.fleet.vehicle-registered`,
      trigger: "VehicleService.createVehicle persists new record",
      payloadFields: ["vehicleId", "orgId", "plate", "registeredAt"],
      consumers: ["svc-fleet-metrics", "job-sync-telemetry"],
    },
    {
      id: "evt-vehicle-status-changed",
      name: "VehicleStatusChanged",
      topic: `${ventureTopic}.fleet.vehicle-status-changed`,
      trigger: "VehicleService.updateStatus changes operational state",
      payloadFields: ["vehicleId", "previousStatus", "newStatus", "changedAt"],
      consumers: ["svc-fleet-metrics", "job-fleet-alerts"],
    },
    {
      id: "evt-fleet-alert-raised",
      name: "FleetAlertRaised",
      topic: `${ventureTopic}.fleet.alert-raised`,
      trigger: "FleetMetricsService.detectAlerts exceeds threshold",
      payloadFields: ["alertId", "orgId", "severity", "message", "raisedAt"],
      consumers: ["job-fleet-alerts", "job-notify-operators"],
    },
    {
      id: "evt-telemetry-ingested",
      name: "TelemetryIngested",
      topic: `${ventureTopic}.fleet.telemetry-ingested`,
      trigger: "Background worker completes telemetry sync",
      payloadFields: ["vehicleId", "batteryLevel", "location", "ingestedAt"],
      consumers: ["svc-vehicle", "svc-fleet-metrics"],
    },
  ];
}
