export class ReconnectManager {
  private attempts = 0;

  constructor(
    private readonly baseDelayMs: number,
    private readonly maxDelayMs: number,
  ) {}

  reset(): void {
    this.attempts = 0;
  }

  attemptCount(): number {
    return this.attempts;
  }

  nextDelayMs(): number {
    const delay = Math.min(this.maxDelayMs, this.baseDelayMs * 2 ** this.attempts);
    this.attempts += 1;
    return delay;
  }
}
