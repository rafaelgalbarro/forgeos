/** Point-in-time snapshots of venture persistence state. */

import { getLocalAdapter } from "../adapters/local-adapter";
import { PERSISTENCE_CONFIG, resolveActiveProvider } from "../config";
import { PERSISTENCE_KEYS, type PersistenceSnapshot } from "../types";

const SNAPSHOT_KEYS = [
  PERSISTENCE_KEYS.workspaces,
  PERSISTENCE_KEYS.organizations,
  PERSISTENCE_KEYS.ventures,
  PERSISTENCE_KEYS.ventureMemory,
  PERSISTENCE_KEYS.decisions,
  PERSISTENCE_KEYS.buildContext,
  PERSISTENCE_KEYS.buildDna,
];

function createSnapshotId(): string {
  return `snap_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Create a point-in-time snapshot of key venture data. */
export async function createSnapshot(
  label: string
): Promise<PersistenceSnapshot> {
  const adapter = getLocalAdapter();
  const entities: Record<string, unknown> = {};

  for (const key of SNAPSHOT_KEYS) {
    entities[key] = await adapter.read(key, null);
  }

  const snapshot: PersistenceSnapshot = {
    id: createSnapshotId(),
    label,
    createdAt: new Date().toISOString(),
    provider: resolveActiveProvider(),
    entities,
  };

  const all = await adapter.read<PersistenceSnapshot[]>(
    PERSISTENCE_KEYS.snapshots,
    []
  );
  all.unshift(snapshot);

  if (all.length > PERSISTENCE_CONFIG.maxSnapshots) {
    all.length = PERSISTENCE_CONFIG.maxSnapshots;
  }

  await adapter.write(PERSISTENCE_KEYS.snapshots, all);
  return snapshot;
}

/** List all stored snapshots (newest first). */
export async function listSnapshots(): Promise<PersistenceSnapshot[]> {
  const adapter = getLocalAdapter();
  return adapter.read<PersistenceSnapshot[]>(PERSISTENCE_KEYS.snapshots, []);
}

/** Restore persistence state from a snapshot. */
export async function restoreSnapshot(
  snapshotId: string
): Promise<boolean> {
  const adapter = getLocalAdapter();
  const all = await listSnapshots();
  const snapshot = all.find((s) => s.id === snapshotId);
  if (!snapshot) return false;

  for (const [key, value] of Object.entries(snapshot.entities)) {
    if (value !== null) {
      await adapter.write(key, value);
    }
  }

  return true;
}

/** Delete a snapshot by ID. */
export async function deleteSnapshot(snapshotId: string): Promise<boolean> {
  const adapter = getLocalAdapter();
  const all = await listSnapshots();
  const filtered = all.filter((s) => s.id !== snapshotId);
  if (filtered.length === all.length) return false;
  await adapter.write(PERSISTENCE_KEYS.snapshots, filtered);
  return true;
}
