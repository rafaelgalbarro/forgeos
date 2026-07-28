/** Program 6500 — Backup status stub */

import type { BackupStatus } from "./types";

export function getBackupStatus(): BackupStatus[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  return [
    {
      id: "venture-data",
      label: "Datos de ventures (localStorage)",
      lastBackupAt: yesterday.toISOString(),
      status: "healthy",
      sizeMb: 2.4,
      retentionDays: 30,
    },
    {
      id: "config-snapshot",
      label: "Snapshot de configuración",
      lastBackupAt: now.toISOString(),
      status: "healthy",
      sizeMb: 0.1,
      retentionDays: 90,
    },
    {
      id: "postgres",
      label: "Base de datos Postgres",
      status: "unknown",
      retentionDays: 7,
    },
  ];
}

export function triggerBackupStub(id: string): BackupStatus | null {
  const backups = getBackupStatus();
  const backup = backups.find((b) => b.id === id);
  if (!backup) return null;
  return { ...backup, lastBackupAt: new Date().toISOString(), status: "healthy" };
}
