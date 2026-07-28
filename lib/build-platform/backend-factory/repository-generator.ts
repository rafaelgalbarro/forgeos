import type { BackendFactoryInput, RepositorySpec } from "./types";

export function generateRepositoryPlan(input: BackendFactoryInput): RepositorySpec[] {
  const dataSource = input.dna.database;

  const baseRepositories: RepositorySpec[] = [
    {
      id: "repo-user",
      name: "UserRepository",
      entity: "User",
      dataSource,
      operations: [
        { id: "user-find-by-id", name: "findById", operation: "read", entity: "User" },
        { id: "user-find-by-email", name: "findByEmail", operation: "query", entity: "User" },
        { id: "user-save", name: "save", operation: "write", entity: "User" },
      ],
      indexes: ["email", "orgId"],
    },
    {
      id: "repo-vehicle",
      name: "VehicleRepository",
      entity: "Vehicle",
      dataSource,
      operations: [
        { id: "vehicle-find-by-id", name: "findById", operation: "read", entity: "Vehicle" },
        { id: "vehicle-list", name: "list", operation: "query", entity: "Vehicle" },
        { id: "vehicle-save", name: "save", operation: "write", entity: "Vehicle" },
        { id: "vehicle-delete", name: "delete", operation: "delete", entity: "Vehicle" },
      ],
      indexes: ["orgId", "status", "plate"],
    },
    {
      id: "repo-fleet",
      name: "FleetRepository",
      entity: "Fleet",
      dataSource,
      operations: [
        { id: "fleet-find-by-org", name: "findByOrgId", operation: "read", entity: "Fleet" },
        { id: "fleet-save-metrics", name: "saveMetrics", operation: "write", entity: "FleetMetrics" },
        { id: "fleet-list-alerts", name: "listAlerts", operation: "query", entity: "FleetAlert" },
      ],
      indexes: ["orgId", "createdAt"],
    },
  ];

  const moduleRepositories: RepositorySpec[] = input.dna.modules
    .filter((module) => module !== "core")
    .map((module) => ({
      id: `repo-${module}`,
      name: `${capitalize(module)}Repository`,
      entity: capitalize(module),
      dataSource,
      operations: [
        {
          id: `${module}-list`,
          name: "list",
          operation: "query" as const,
          entity: capitalize(module),
        },
        {
          id: `${module}-save`,
          name: "save",
          operation: "write" as const,
          entity: capitalize(module),
        },
      ],
    }));

  return [...baseRepositories, ...moduleRepositories];
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
