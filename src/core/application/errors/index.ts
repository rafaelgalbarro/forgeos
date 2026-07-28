/**
 * Application error contract (Program 6020).
 * Never expose stack traces or secrets to UI consumers.
 */

export type ApplicationErrorCategory =
  | "validation"
  | "authorization"
  | "not_found"
  | "conflict"
  | "invalid_transition"
  | "idempotency"
  | "infrastructure"
  | "transaction"
  | "unknown";

export interface ApplicationError {
  code: string;
  message: string;
  category: ApplicationErrorCategory;
  retryable: boolean;
  fieldErrors?: Record<string, string>;
  correlationId?: string;
}

export class ApplicationFailure extends Error {
  readonly appError: ApplicationError;

  constructor(error: ApplicationError) {
    super(error.message);
    this.name = "ApplicationFailure";
    this.appError = error;
  }
}

export function toApplicationError(
  err: unknown,
  correlationId?: string,
): ApplicationError {
  if (err instanceof ApplicationFailure) {
    return {
      ...err.appError,
      correlationId: err.appError.correlationId ?? correlationId,
    };
  }
  if (err instanceof Error) {
    const msg = err.message;
    if (msg.startsWith("Invalid mission transition") || msg.includes("Cannot ")) {
      return {
        code: "INVALID_TRANSITION",
        message: msg,
        category: "invalid_transition",
        retryable: false,
        correlationId,
      };
    }
    if (msg.includes("not found") || msg.includes("Not found")) {
      return {
        code: "NOT_FOUND",
        message: msg,
        category: "not_found",
        retryable: false,
        correlationId,
      };
    }
    return {
      code: "UNEXPECTED",
      message: "An unexpected application error occurred",
      category: "unknown",
      retryable: true,
      correlationId,
    };
  }
  return {
    code: "UNEXPECTED",
    message: "An unexpected application error occurred",
    category: "unknown",
    retryable: true,
    correlationId,
  };
}

export function fail(
  partial: Omit<ApplicationError, "retryable"> & { retryable?: boolean },
): never {
  throw new ApplicationFailure({
    retryable: partial.retryable ?? false,
    ...partial,
  });
}
