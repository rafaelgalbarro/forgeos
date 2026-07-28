"use client";

/** Sync / autosave status indicator for persistence layer. */

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/fhis/Badge";
import {
  getAutosaveStatus,
  getSyncStatus,
  onAutosaveStatusChange,
  onSyncStatusChange,
  resolveActiveProvider,
  type SyncStatus,
} from "@/lib/persistence";

const STATUS_LABELS: Record<SyncStatus, string> = {
  idle: "Guardado",
  syncing: "Guardando…",
  synced: "Sincronizado",
  error: "Error de sync",
  offline: "Sin conexión",
};

const STATUS_VARIANT: Record<
  SyncStatus,
  "default" | "accent" | "blue" | "amber" | "red"
> = {
  idle: "default",
  syncing: "blue",
  synced: "accent",
  error: "red",
  offline: "amber",
};

export function SyncStatusBadge() {
  const [status, setStatus] = useState<SyncStatus>("idle");
  const provider = resolveActiveProvider();

  useEffect(() => {
    setStatus(getAutosaveStatus());
    const unsubAutosave = onAutosaveStatusChange(setStatus);
    const unsubSync = onSyncStatusChange((s) => {
      if (s !== "idle") setStatus(s);
    });
    return () => {
      unsubAutosave();
      unsubSync();
    };
  }, []);

  const effectiveStatus =
    status === "idle" ? getSyncStatus() : status;

  return (
    <span title={`Proveedor: ${provider}`}>
      <Badge
        variant={STATUS_VARIANT[effectiveStatus]}
        className="fhis-sync-status-badge"
      >
        {STATUS_LABELS[effectiveStatus]}
      </Badge>
    </span>
  );
}
