import { deriveSessionPhase } from "./clock-and-timezones";
import type { SessionDescriptor, SessionPhase } from "./types";

export class SessionCalendar {
  private readonly phaseByInstrument = new Map<string, SessionPhase>();

  update(input: {
    instrumentId: string;
    occurredAtUtc: string;
    descriptor: SessionDescriptor;
  }): { previous: SessionPhase | null; current: SessionPhase } {
    const current = deriveSessionPhase({
      utcIso: input.occurredAtUtc,
      timezone: input.descriptor.timezone,
      holidaysUtc: input.descriptor.holidaysUtc,
      premarketOpenLocal: input.descriptor.premarketOpenLocal,
      regularOpenLocal: input.descriptor.regularOpenLocal,
      regularCloseLocal: input.descriptor.regularCloseLocal,
      afterHoursCloseLocal: input.descriptor.afterHoursCloseLocal,
    });
    const previous = this.phaseByInstrument.get(input.instrumentId) ?? null;
    this.phaseByInstrument.set(input.instrumentId, current);
    return { previous, current };
  }

  recover(map: Record<string, SessionPhase>): void {
    this.phaseByInstrument.clear();
    for (const [instrumentId, phase] of Object.entries(map)) {
      this.phaseByInstrument.set(instrumentId, phase);
    }
  }

  snapshot(): Record<string, SessionPhase> {
    return Object.fromEntries(this.phaseByInstrument.entries());
  }
}
