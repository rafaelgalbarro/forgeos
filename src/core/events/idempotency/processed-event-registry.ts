/**
 * PROGRAM 6040 — Idempotent event handling
 * ProcessedEventRegistry keyed by (handlerId, eventId)
 */

export interface ProcessedEventRecord {
  readonly handlerId: string;
  readonly eventId: string;
  readonly processedAt: string;
  readonly result?: "ok" | "skipped" | "failed";
}

export interface ProcessedEventRegistry {
  has(handlerId: string, eventId: string): boolean;
  mark(handlerId: string, eventId: string, result?: ProcessedEventRecord["result"]): void;
  clear(): void;
  size(): number;
  list(): ProcessedEventRecord[];
}

export function createProcessedEventRegistry(): ProcessedEventRegistry {
  const map = new Map<string, ProcessedEventRecord>();

  function key(handlerId: string, eventId: string): string {
    return `${handlerId}::${eventId}`;
  }

  return {
    has(handlerId, eventId) {
      return map.has(key(handlerId, eventId));
    },
    mark(handlerId, eventId, result = "ok") {
      map.set(key(handlerId, eventId), {
        handlerId,
        eventId,
        processedAt: new Date().toISOString(),
        result,
      });
    },
    clear() {
      map.clear();
    },
    size() {
      return map.size;
    },
    list() {
      return [...map.values()];
    },
  };
}

export type SideEffectHandler<TEvent> = (event: TEvent) => void | Promise<void>;

export interface IdempotentHandleResult {
  readonly executed: boolean;
  readonly skipped: boolean;
  readonly error?: string;
}

/**
 * Runs side-effecting handlers at most once per (handlerId, eventId).
 * Retries that already succeeded are skipped — prevents duplicate deploy/output.
 */
export async function handleIdempotently<TEvent extends { eventId: string | { toString(): string } }>(
  registry: ProcessedEventRegistry,
  handlerId: string,
  event: TEvent,
  handler: SideEffectHandler<TEvent>
): Promise<IdempotentHandleResult> {
  const eventId = String(event.eventId);
  if (registry.has(handlerId, eventId)) {
    return { executed: false, skipped: true };
  }
  try {
    await handler(event);
    registry.mark(handlerId, eventId, "ok");
    return { executed: true, skipped: false };
  } catch (e) {
    registry.mark(handlerId, eventId, "failed");
    return {
      executed: false,
      skipped: false,
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
