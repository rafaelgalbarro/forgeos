/** Sync layer — local ↔ remote persistence coordination. */

import { getLocalAdapter } from "../adapters/local-adapter";
import { getPostgresAdapter } from "../adapters/postgres-adapter";
import { getSupabaseAdapter } from "../adapters/supabase-adapter";
import type { PersistenceAdapter } from "../adapters/adapter-types";
import { PERSISTENCE_CONFIG, resolveActiveProvider } from "../config";
import { PERSISTENCE_KEYS, type PersistenceKey, type SyncStatus } from "../types";

let syncStatus: SyncStatus = "idle";
let syncTimer: ReturnType<typeof setInterval> | null = null;
const statusListeners = new Set<(status: SyncStatus) => void>();

export function getSyncStatus(): SyncStatus {
  return syncStatus;
}

export function onSyncStatusChange(
  listener: (status: SyncStatus) => void
): () => void {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

function setSyncStatus(status: SyncStatus): void {
  syncStatus = status;
  statusListeners.forEach((l) => l(status));
}

export function getRemoteAdapter(): PersistenceAdapter | null {
  const provider = resolveActiveProvider();
  if (provider === "supabase") return getSupabaseAdapter();
  if (provider === "postgres") return getPostgresAdapter();
  return null;
}

export function getLocalPersistenceAdapter(): PersistenceAdapter {
  return getLocalAdapter();
}

const SYNCABLE_KEYS: PersistenceKey[] = [
  PERSISTENCE_KEYS.workspaces,
  PERSISTENCE_KEYS.organizations,
  PERSISTENCE_KEYS.users,
  PERSISTENCE_KEYS.ventures,
  PERSISTENCE_KEYS.ventureMemory,
  PERSISTENCE_KEYS.decisions,
  PERSISTENCE_KEYS.ceoMemory,
  PERSISTENCE_KEYS.buildContext,
  PERSISTENCE_KEYS.buildDna,
];

/** Push local data to remote adapter for all syncable keys. */
export async function syncToRemote(): Promise<{ synced: number; errors: number }> {
  const remote = getRemoteAdapter();
  if (!remote?.isAvailable()) {
    setSyncStatus("offline");
    return { synced: 0, errors: 0 };
  }

  const local = getLocalAdapter();
  setSyncStatus("syncing");

  let synced = 0;
  let errors = 0;

  for (const key of SYNCABLE_KEYS) {
    try {
      const data = await local.read(key, null);
      if (data !== null) {
        await remote.write(key, data);
        synced++;
      }
    } catch {
      errors++;
    }
  }

  setSyncStatus(errors > 0 ? "error" : "synced");
  return { synced, errors };
}

/** Pull remote data into local cache. */
export async function syncFromRemote(): Promise<{ synced: number; errors: number }> {
  const remote = getRemoteAdapter();
  if (!remote?.isAvailable()) {
    setSyncStatus("offline");
    return { synced: 0, errors: 0 };
  }

  const local = getLocalAdapter();
  setSyncStatus("syncing");

  let synced = 0;
  let errors = 0;

  for (const key of SYNCABLE_KEYS) {
    try {
      const data = await remote.read(key, null);
      if (data !== null) {
        await local.write(key, data);
        synced++;
      }
    } catch {
      errors++;
    }
  }

  setSyncStatus(errors > 0 ? "error" : "synced");
  return { synced, errors };
}

/** Start periodic background sync. */
export function startBackgroundSync(): void {
  if (syncTimer || typeof window === "undefined") return;
  if (!getRemoteAdapter()?.isAvailable()) return;

  syncTimer = setInterval(() => {
    void syncToRemote();
  }, PERSISTENCE_CONFIG.syncIntervalMs);
}

export function stopBackgroundSync(): void {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
}
