export type HeartbeatListener = (atUtc: string) => void;

/**
 * Heartbeat control loop for the live market runtime.
 * Does not open any order path — observation only.
 */
export class HeartbeatService {
  private timer: ReturnType<typeof setInterval> | null = null;
  private lastBeatUtc: string | null = null;
  private missCount = 0;
  private readonly listeners = new Set<HeartbeatListener>();

  constructor(
    private readonly intervalMs: number,
    private readonly maxMisses: number,
    private readonly nowProvider: () => string = () => new Date().toISOString(),
  ) {}

  start(): void {
    this.stop();
    this.missCount = 0;
    this.beat();
    this.timer = setInterval(() => this.tick(), this.intervalMs);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  beat(atUtc = this.nowProvider()): void {
    this.lastBeatUtc = atUtc;
    this.missCount = 0;
    for (const listener of this.listeners) listener(atUtc);
  }

  onBeat(listener: HeartbeatListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  lastBeat(): string | null {
    return this.lastBeatUtc;
  }

  consecutiveMisses(): number {
    return this.missCount;
  }

  isHealthy(): boolean {
    return this.missCount < this.maxMisses;
  }

  lagMs(nowUtc = this.nowProvider()): number {
    if (!this.lastBeatUtc) return Number.MAX_SAFE_INTEGER;
    return Math.max(0, Date.parse(nowUtc) - Date.parse(this.lastBeatUtc));
  }

  private tick(): void {
    const now = this.nowProvider();
    if (!this.lastBeatUtc) {
      this.missCount += 1;
      return;
    }
    const lag = Date.parse(now) - Date.parse(this.lastBeatUtc);
    if (lag > this.intervalMs * 1.5) {
      this.missCount += 1;
    }
  }
}
