/** Debounced autosave for persistence writes. */

import { PERSISTENCE_CONFIG } from "../config";
import type { SyncStatus } from "../types";

type SaveFn = () => Promise<void>;

interface PendingSave {
  key: string;
  fn: SaveFn;
  timer: ReturnType<typeof setTimeout> | null;
}

const pending = new Map<string, PendingSave>();
let globalStatus: SyncStatus = "idle";
const listeners = new Set<(status: SyncStatus) => void>();

export function getAutosaveStatus(): SyncStatus {
  return globalStatus;
}

export function onAutosaveStatusChange(
  listener: (status: SyncStatus) => void
): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setStatus(status: SyncStatus): void {
  globalStatus = status;
  listeners.forEach((l) => l(status));
}

function notifyIdle(): void {
  if (pending.size === 0) setStatus("idle");
}

/**
 * Schedule a debounced save. Multiple calls with the same key
 * coalesce into a single write after the debounce window.
 */
export function scheduleAutosave(key: string, fn: SaveFn): void {
  const existing = pending.get(key);
  if (existing?.timer) clearTimeout(existing.timer);

  const entry: PendingSave = {
    key,
    fn,
    timer: setTimeout(async () => {
      setStatus("syncing");
      try {
        await fn();
        setStatus("synced");
      } catch {
        setStatus("error");
      } finally {
        pending.delete(key);
        notifyIdle();
      }
    }, PERSISTENCE_CONFIG.autosaveDebounceMs),
  };

  pending.set(key, entry);
  setStatus("syncing");
}

/** Flush all pending autosaves immediately. */
export async function flushAutosave(): Promise<void> {
  const entries = [...pending.values()];
  for (const entry of entries) {
    if (entry.timer) clearTimeout(entry.timer);
    pending.delete(entry.key);
    await entry.fn();
  }
  setStatus("synced");
}

/** Cancel pending autosave for a key. */
export function cancelAutosave(key: string): void {
  const entry = pending.get(key);
  if (entry?.timer) clearTimeout(entry.timer);
  pending.delete(key);
  notifyIdle();
}
