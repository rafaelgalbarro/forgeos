/**
 * Shared value objects — PROGRAM 6010
 */

import { DomainError } from "./errors";
import { err, ok, type Result } from "./result";

export type IsoTimestamp = string & { readonly __isoTimestamp: unique symbol };

export function Timestamp(value: string | Date = new Date()): Result<IsoTimestamp, DomainError> {
  const raw =
    value instanceof Date ? value.toISOString() : String(value).trim();
  const parsed = Date.parse(raw);
  if (Number.isNaN(parsed)) {
    return err(DomainError.invariant("Timestamp", `Invalid timestamp: ${raw}`));
  }
  return ok(new Date(parsed).toISOString() as IsoTimestamp);
}

export function nowTimestamp(): IsoTimestamp {
  return new Date().toISOString() as IsoTimestamp;
}

/** Brand an already-valid ISO string (e.g. from ClockPort) without re-parsing. */
export function asIsoTimestamp(value: string): IsoTimestamp {
  return value as IsoTimestamp;
}

export type Version = string & { readonly __version: unique symbol };

export function Version(value: string): Result<Version, DomainError> {
  const v = value.trim();
  if (!v) {
    return err(DomainError.invariant("Version", "Version must be non-empty"));
  }
  return ok(v as Version);
}

export function asVersion(value: string): Version {
  const r = Version(value);
  if (!r.ok) throw new Error(r.error.message);
  return r.value;
}

export type Money = Readonly<{
  amount: number;
  currency: string;
}>;

export function Money(amount: number, currency = "USD"): Result<Money, DomainError> {
  if (!Number.isFinite(amount)) {
    return err(DomainError.invariant("Money", "Amount must be finite"));
  }
  const c = currency.trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(c)) {
    return err(DomainError.invariant("Money", "Currency must be ISO-4217 (3 letters)"));
  }
  return ok(Object.freeze({ amount, currency: c }));
}

/** 0–100 inclusive */
export type Percentage = number & { readonly __percentage: unique symbol };

export function Percentage(value: number): Result<Percentage, DomainError> {
  if (!Number.isFinite(value) || value < 0 || value > 100) {
    return err(DomainError.invariant("Percentage", "Percentage must be 0–100"));
  }
  return ok(value as Percentage);
}

/** 0–1 inclusive confidence score */
export type Confidence = number & { readonly __confidence: unique symbol };

export function Confidence(value: number): Result<Confidence, DomainError> {
  if (!Number.isFinite(value) || value < 0 || value > 1) {
    return err(DomainError.invariant("Confidence", "Confidence must be 0–1"));
  }
  return ok(value as Confidence);
}

export type RiskLevel = "NONE" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";

export const RISK_LEVELS: readonly RiskLevel[] = [
  "NONE",
  "LOW",
  "MEDIUM",
  "HIGH",
  "CRITICAL",
] as const;

export function parseRiskLevel(value: string): Result<RiskLevel, DomainError> {
  const v = value.trim().toUpperCase() as RiskLevel;
  if (!RISK_LEVELS.includes(v)) {
    return err(DomainError.invariant("RiskLevel", `Invalid risk level: ${value}`));
  }
  return ok(v);
}

/** Current canonical schema version for snapshots */
export const CURRENT_SCHEMA_VERSION = 1 as const;
export type SchemaVersion = number;

export type CanonicalSnapshotMeta = Readonly<{
  schemaVersion: SchemaVersion;
}>;
