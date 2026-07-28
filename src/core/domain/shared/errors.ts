/**
 * Domain errors — PROGRAM 6010
 */

export type DomainErrorCode =
  | "INVARIANT_VIOLATION"
  | "INVALID_TRANSITION"
  | "NOT_FOUND"
  | "CONFLICT"
  | "VALIDATION"
  | "UNSUPPORTED_SCHEMA";

export class DomainError extends Error {
  readonly code: DomainErrorCode;
  readonly aggregate?: string;
  readonly details?: Readonly<Record<string, unknown>>;

  constructor(
    code: DomainErrorCode,
    message: string,
    options?: { aggregate?: string; details?: Record<string, unknown>; cause?: unknown }
  ) {
    super(message);
    this.name = "DomainError";
    this.code = code;
    this.aggregate = options?.aggregate;
    this.details = options?.details ? Object.freeze({ ...options.details }) : undefined;
    if (options?.cause !== undefined) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }

  static invariant(
    aggregate: string,
    message: string,
    details?: Record<string, unknown>
  ): DomainError {
    return new DomainError("INVARIANT_VIOLATION", message, { aggregate, details });
  }

  static invalidTransition(
    aggregate: string,
    from: string,
    to: string,
    details?: Record<string, unknown>
  ): DomainError {
    return new DomainError(
      "INVALID_TRANSITION",
      `Invalid ${aggregate} transition: ${from} → ${to}`,
      { aggregate, details: { from, to, ...details } }
    );
  }

  static validation(message: string, details?: Record<string, unknown>): DomainError {
    return new DomainError("VALIDATION", message, { details });
  }

  static notFound(aggregate: string, id: string): DomainError {
    return new DomainError("NOT_FOUND", `${aggregate} not found: ${id}`, {
      aggregate,
      details: { id },
    });
  }

  static unsupportedSchema(
    aggregate: string,
    version: number,
    details?: Record<string, unknown>
  ): DomainError {
    return new DomainError(
      "UNSUPPORTED_SCHEMA",
      `Unsupported ${aggregate} schemaVersion=${version}`,
      { aggregate, details: { version, ...details } }
    );
  }
}
