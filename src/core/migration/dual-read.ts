/**
 * PROGRAM 6070 — DualReadService.
 * Read V2 → fallback legacy → register fallback → surface inconsistencies (never hide).
 */

import { isV2FlagEnabled } from "./feature-flags";
import { recordDivergence, recordError, recordFallback } from "./telemetry";
import type { DualReadResult, MigrationComponentId } from "./types";

export interface DualReadOptions<T> {
  component: MigrationComponentId;
  /** Prefer V2 when queries/domain flags allow. */
  readV2: () => Promise<T | null> | T | null;
  readLegacy: () => Promise<T | null> | T | null;
  /** Optional comparator; returns human-readable inconsistency or null. */
  compare?: (v2: T, legacy: T) => string | null;
  /** Force dual-read path even if flags are off (tests / dry-run). */
  forceDual?: boolean;
  /** Summarize value for telemetry (keep short). */
  summarize?: (value: T) => string;
}

function nowIso(): string {
  return new Date().toISOString();
}

export class DualReadService {
  async read<T>(opts: DualReadOptions<T>): Promise<DualReadResult<T>> {
    const at = nowIso();
    const useV2 =
      opts.forceDual ||
      isV2FlagEnabled("ENABLE_V2_QUERIES") ||
      isV2FlagEnabled("ENABLE_V2_DOMAIN");

    if (!useV2) {
      try {
        const legacy = await opts.readLegacy();
        return {
          value: legacy,
          source: legacy == null ? "none" : "legacy",
          fallbackUsed: false,
          inconsistency: null,
          component: opts.component,
          at,
        };
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        recordError(opts.component, `legacy read failed: ${message}`);
        return {
          value: null,
          source: "none",
          fallbackUsed: false,
          inconsistency: `legacy_read_error: ${message}`,
          component: opts.component,
          at,
        };
      }
    }

    let v2: T | null = null;
    let v2Error: string | null = null;
    try {
      v2 = await opts.readV2();
    } catch (err) {
      v2Error = err instanceof Error ? err.message : String(err);
      recordError(opts.component, `v2 read failed: ${v2Error}`);
    }

    if (v2 != null) {
      // Opportunistic consistency check against legacy (does not change primary).
      try {
        const legacy = await opts.readLegacy();
        if (legacy != null && opts.compare) {
          const inconsistency = opts.compare(v2, legacy);
          if (inconsistency) {
            recordDivergence({
              component: opts.component,
              kind: "read",
              message: inconsistency,
              at,
              v2Summary: opts.summarize?.(v2),
              legacySummary: opts.summarize?.(legacy),
            });
            return {
              value: v2,
              source: "v2",
              fallbackUsed: false,
              inconsistency,
              component: opts.component,
              at,
            };
          }
        }
      } catch {
        // Legacy compare failure is logged but does not hide V2 success.
        recordFallback({
          component: opts.component,
          reason: "legacy_compare_failed",
          at,
          details: "V2 primary returned; legacy compare skipped",
        });
      }

      return {
        value: v2,
        source: "v2",
        fallbackUsed: false,
        inconsistency: null,
        component: opts.component,
        at,
      };
    }

    // Fallback to legacy — always registered.
    recordFallback({
      component: opts.component,
      reason: v2Error ? "v2_error" : "v2_miss",
      at,
      details: v2Error ?? "V2 returned null",
    });

    try {
      const legacy = await opts.readLegacy();
      return {
        value: legacy,
        source: legacy == null ? "none" : "legacy",
        fallbackUsed: true,
        inconsistency: v2Error ? `v2_error_then_legacy: ${v2Error}` : "v2_miss_then_legacy",
        component: opts.component,
        at,
      };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      recordError(opts.component, `legacy fallback failed: ${message}`);
      return {
        value: null,
        source: "none",
        fallbackUsed: true,
        inconsistency: `both_failed: v2=${v2Error ?? "miss"}; legacy=${message}`,
        component: opts.component,
        at,
      };
    }
  }
}

export const dualReadService = new DualReadService();
