import "server-only";

export type InvestmentEvent =
  | { type: "signal"; at: string; payload: unknown }
  | { type: "order_executed"; at: string; payload: unknown }
  | { type: "circuit_breaker"; at: string; payload: { reason: string; lossPct?: number } }
  | { type: "cycle_complete"; at: string; payload: unknown }
  | { type: "position_closed"; at: string; payload: unknown }
  | { type: "system_paused"; at: string }
  | { type: "system_resumed"; at: string }
  | { type: "heartbeat"; at: string };

type Listener = (event: InvestmentEvent) => void;

const listeners = new Set<Listener>();
const recent: InvestmentEvent[] = [];
const MAX_RECENT = 100;

export function publishInvestmentEvent(event: InvestmentEvent): void {
  recent.unshift(event);
  if (recent.length > MAX_RECENT) recent.pop();
  for (const fn of listeners) {
    try {
      fn(event);
    } catch (err) {
      console.warn("[InvestmentEvents] listener error:", err);
    }
  }
}

export function subscribeInvestmentEvents(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRecentInvestmentEvents(limit = 20): InvestmentEvent[] {
  return recent.slice(0, limit);
}
