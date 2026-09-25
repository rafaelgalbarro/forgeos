import type { MarketSessionDescriptor, SessionPhase } from "../domain";

function parseHm(value: string): { hour: number; minute: number } {
  const [h, m] = value.split(":").map((part) => Number(part));
  return { hour: h ?? 0, minute: m ?? 0 };
}

function localMinutesFromUtc(utcIso: string, timezone: string): number {
  const date = new Date(utcIso);
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    hourCycle: "h23",
    hour: "2-digit",
    minute: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  const hour = Number(parts.find((part) => part.type === "hour")?.value ?? "0");
  const minute = Number(parts.find((part) => part.type === "minute")?.value ?? "0");
  return hour * 60 + minute;
}

export function getLocalDateKey(utcIso: string, timezone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(utcIso));
}

export function deriveSessionPhase(input: {
  utcIso: string;
  timezone: string;
  holidaysUtc: readonly string[];
  premarketOpenLocal: string;
  regularOpenLocal: string;
  regularCloseLocal: string;
  afterHoursCloseLocal: string;
}): SessionPhase {
  const localDateKey = getLocalDateKey(input.utcIso, input.timezone);
  if (input.holidaysUtc.includes(localDateKey)) return "closed";

  const localWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: input.timezone,
    weekday: "short",
  }).format(new Date(input.utcIso));
  if (localWeekday === "Sat" || localWeekday === "Sun") return "closed";

  const minutes = localMinutesFromUtc(input.utcIso, input.timezone);
  const premarket = parseHm(input.premarketOpenLocal);
  const regularOpen = parseHm(input.regularOpenLocal);
  const regularClose = parseHm(input.regularCloseLocal);
  const afterClose = parseHm(input.afterHoursCloseLocal);
  const premarketStart = premarket.hour * 60 + premarket.minute;
  const regularStart = regularOpen.hour * 60 + regularOpen.minute;
  const regularEnd = regularClose.hour * 60 + regularClose.minute;
  const afterEnd = afterClose.hour * 60 + afterClose.minute;

  if (minutes >= premarketStart && minutes < regularStart) return "premarket";
  if (minutes >= regularStart && minutes < regularEnd) return "regular";
  if (minutes >= regularEnd && minutes < afterEnd) return "after-hours";
  return "overnight";
}

export class MarketCalendar {
  private readonly phaseByInstrument = new Map<string, SessionPhase>();

  update(input: {
    instrumentId: string;
    occurredAtUtc: string;
    descriptor: MarketSessionDescriptor;
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

  isMarketOpen(phase: SessionPhase): boolean {
    return phase === "regular" || phase === "premarket" || phase === "after-hours";
  }

  recover(map: Readonly<Record<string, SessionPhase>>): void {
    this.phaseByInstrument.clear();
    for (const [instrumentId, phase] of Object.entries(map)) {
      this.phaseByInstrument.set(instrumentId, phase);
    }
  }

  snapshot(): Record<string, SessionPhase> {
    return Object.fromEntries(this.phaseByInstrument.entries());
  }
}
