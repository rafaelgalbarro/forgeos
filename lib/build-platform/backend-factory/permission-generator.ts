import type { BackendFactoryInput, PermissionSpec } from "./types";

export function generatePermissionPlan(input: BackendFactoryInput): PermissionSpec[] {
  const ventureResource = input.context.meta.ventureName.toLowerCase().replace(/\s+/g, "-");

  return [
    {
      id: "perm-admin-all",
      role: "admin",
      resource: "*",
      actions: ["create", "read", "update", "delete", "manage"],
      scope: "global",
    },
    {
      id: "perm-fleet-manager-vehicles",
      role: "fleet_manager",
      resource: "vehicles",
      actions: ["create", "read", "update"],
      scope: "org",
    },
    {
      id: "perm-fleet-manager-metrics",
      role: "fleet_manager",
      resource: "fleet/metrics",
      actions: ["read"],
      scope: "org",
    },
    {
      id: "perm-driver-vehicles-read",
      role: "driver",
      resource: "vehicles",
      actions: ["read"],
      scope: "self",
    },
    {
      id: "perm-operator-alerts",
      role: "operator",
      resource: "alerts",
      actions: ["read", "acknowledge"],
      scope: "org",
    },
    {
      id: "perm-viewer-dashboard",
      role: "viewer",
      resource: `${ventureResource}/dashboard`,
      actions: ["read"],
      scope: "org",
    },
  ];
}
