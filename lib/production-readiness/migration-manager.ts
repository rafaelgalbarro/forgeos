/** Program 6500 — Migration status stub */

import type { MigrationStatus } from "./types";

const MIGRATIONS: MigrationStatus[] = [
  {
    id: "mig-6500",
    name: "production_readiness_init",
    version: "6500",
    status: "applied",
    appliedAt: new Date().toISOString(),
  },
  {
    id: "mig-6000",
    name: "commercial_readiness",
    version: "6000",
    status: "applied",
    appliedAt: new Date(Date.now() - 14 * 86400000).toISOString(),
  },
  {
    id: "mig-3000-s6",
    name: "beta_platform",
    version: "3000.6",
    status: "applied",
    appliedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
];

export function listMigrations(): MigrationStatus[] {
  return MIGRATIONS;
}

export function getPendingMigrations(): MigrationStatus[] {
  return MIGRATIONS.filter((m) => m.status === "pending");
}
