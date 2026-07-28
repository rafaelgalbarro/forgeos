/**
 * PROGRAM 6100 — Resource locks for venture/project/release/sandbox/deployment.
 */

export type LockResourceType = "venture" | "project" | "release" | "sandbox" | "deployment";

export interface ResourceLock {
  resourceType: LockResourceType;
  resourceId: string;
  ventureId: string;
  acquiredAt: string;
  acquiredBy: string;
  expiresAt: string;
}

const activeLocks = new Map<string, ResourceLock>();

function lockKey(type: LockResourceType, id: string): string {
  return `${type}:${id}`;
}

export function acquireLock(
  resourceType: LockResourceType,
  resourceId: string,
  ventureId: string,
  acquiredBy: string,
  ttlMs = 300_000,
): ResourceLock | null {
  const key = lockKey(resourceType, resourceId);
  const existing = activeLocks.get(key);
  if (existing && new Date(existing.expiresAt).getTime() > Date.now()) {
    if (existing.ventureId !== ventureId) return null;
    return existing;
  }
  const now = Date.now();
  const lock: ResourceLock = {
    resourceType,
    resourceId,
    ventureId,
    acquiredAt: new Date(now).toISOString(),
    acquiredBy,
    expiresAt: new Date(now + ttlMs).toISOString(),
  };
  activeLocks.set(key, lock);
  return lock;
}

export function releaseLock(resourceType: LockResourceType, resourceId: string): boolean {
  return activeLocks.delete(lockKey(resourceType, resourceId));
}

export function isLocked(resourceType: LockResourceType, resourceId: string, ventureId?: string): boolean {
  const lock = activeLocks.get(lockKey(resourceType, resourceId));
  if (!lock) return false;
  if (new Date(lock.expiresAt).getTime() < Date.now()) {
    activeLocks.delete(lockKey(resourceType, resourceId));
    return false;
  }
  if (ventureId && lock.ventureId !== ventureId) return false;
  return true;
}

export function resetLocks(): void {
  activeLocks.clear();
}
