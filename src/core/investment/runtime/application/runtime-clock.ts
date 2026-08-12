/**
 * RuntimeClock keeps a synchronized view of wall-clock vs reference exchange time.
 * offsetMs = referenceUtc - localUtc (positive means local clock is behind).
 */
export class RuntimeClock {
  private offsetMs = 0;
  private lastSyncedAtUtc: string | null = null;

  nowUtc(localNow = new Date()): string {
    return new Date(localNow.getTime() + this.offsetMs).toISOString();
  }

  nowMs(localNow = Date.now()): number {
    return localNow + this.offsetMs;
  }

  sync(referenceUtc: string, localNow = new Date()): number {
    const referenceMs = Date.parse(referenceUtc);
    if (!Number.isFinite(referenceMs)) {
      throw new Error(`Invalid referenceUtc for clock sync: ${referenceUtc}`);
    }
    this.offsetMs = referenceMs - localNow.getTime();
    this.lastSyncedAtUtc = localNow.toISOString();
    return this.offsetMs;
  }

  offset(): number {
    return this.offsetMs;
  }

  lastSyncedAt(): string | null {
    return this.lastSyncedAtUtc;
  }

  recover(offsetMs: number): void {
    this.offsetMs = offsetMs;
  }
}
