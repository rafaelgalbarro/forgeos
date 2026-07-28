/**
 * PROGRAM 6040 — Event processing observability
 * Records duration, failures, retries, dead-letter equivalent, handler, correlation chain.
 * Never stores sensitive payload contents.
 */

export interface ProcessingObservation {
  readonly observationId: string;
  readonly handlerId: string;
  readonly eventId: string;
  readonly eventType: string;
  readonly correlationId: string;
  readonly causationId?: string;
  readonly startedAt: string;
  readonly finishedAt?: string;
  readonly durationMs?: number;
  readonly status: "started" | "succeeded" | "failed" | "retried" | "dead_letter";
  readonly attempt: number;
  readonly errorCode?: string;
  readonly errorMessage?: string;
}

export interface DeadLetterRecord {
  readonly eventId: string;
  readonly handlerId: string;
  readonly eventType: string;
  readonly correlationId: string;
  readonly failedAt: string;
  readonly attempts: number;
  readonly errorCode: string;
  readonly errorMessage: string;
}

export interface EventObservabilityStore {
  record(observation: ProcessingObservation): void;
  deadLetter(record: DeadLetterRecord): void;
  listObservations(limit?: number): ProcessingObservation[];
  listDeadLetters(limit?: number): DeadLetterRecord[];
  clear(): void;
}

let obsCounter = 0;

export function createEventObservabilityStore(max = 2_000): EventObservabilityStore {
  const observations: ProcessingObservation[] = [];
  const deadLetters: DeadLetterRecord[] = [];

  return {
    record(observation) {
      observations.push(observation);
      if (observations.length > max) observations.splice(0, observations.length - max);
    },
    deadLetter(record) {
      deadLetters.push(record);
      if (deadLetters.length > max) deadLetters.splice(0, deadLetters.length - max);
    },
    listObservations(limit = 100) {
      return observations.slice(-limit);
    },
    listDeadLetters(limit = 100) {
      return deadLetters.slice(-limit);
    },
    clear() {
      observations.length = 0;
      deadLetters.length = 0;
    },
  };
}

export function startProcessing(
  store: EventObservabilityStore,
  input: {
    handlerId: string;
    eventId: string;
    eventType: string;
    correlationId: string;
    causationId?: string;
    attempt?: number;
  }
): ProcessingObservation {
  obsCounter += 1;
  const observation: ProcessingObservation = {
    observationId: `obs_${Date.now().toString(36)}_${obsCounter}`,
    handlerId: input.handlerId,
    eventId: input.eventId,
    eventType: input.eventType,
    correlationId: input.correlationId,
    causationId: input.causationId,
    startedAt: new Date().toISOString(),
    status: "started",
    attempt: input.attempt ?? 1,
  };
  store.record(observation);
  return observation;
}

export function finishProcessing(
  store: EventObservabilityStore,
  started: ProcessingObservation,
  status: "succeeded" | "failed" | "retried" | "dead_letter",
  error?: { code?: string; message?: string }
): ProcessingObservation {
  const finishedAt = new Date().toISOString();
  const durationMs = Math.max(0, Date.parse(finishedAt) - Date.parse(started.startedAt));
  const observation: ProcessingObservation = {
    ...started,
    finishedAt,
    durationMs,
    status,
    errorCode: error?.code,
    errorMessage: error?.message ? sanitizeErrorMessage(error.message) : undefined,
  };
  store.record(observation);
  if (status === "dead_letter") {
    store.deadLetter({
      eventId: started.eventId,
      handlerId: started.handlerId,
      eventType: started.eventType,
      correlationId: started.correlationId,
      failedAt: finishedAt,
      attempts: started.attempt,
      errorCode: error?.code ?? "HANDLER_FAILED",
      errorMessage: sanitizeErrorMessage(error?.message ?? "Unknown error"),
    });
  }
  return observation;
}

/** Strip likely secrets from error strings */
export function sanitizeErrorMessage(message: string): string {
  return message
    .replace(/(api[_-]?key|token|password|secret)\s*[:=]\s*\S+/gi, "$1=[redacted]")
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .slice(0, 500);
}

let sharedObs: EventObservabilityStore | null = null;

export function getSharedEventObservabilityStore(): EventObservabilityStore {
  if (!sharedObs) sharedObs = createEventObservabilityStore();
  return sharedObs;
}

export function resetSharedEventObservabilityStore(): void {
  sharedObs = null;
}
