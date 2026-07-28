/**
 * PROGRAM 6070 — DualWriteService (temporary only).
 * Records V2 success, legacy success, divergence, retry, repair.
 * Retirement condition is always attached to the result.
 */

import { isV2FlagEnabled } from "./feature-flags";
import { recordDivergence, recordDualWrite, recordError } from "./telemetry";
import type { DualWriteResult, MigrationComponentId } from "./types";

/** Default retirement: remove dual-write after consumers + checksum parity proven. */
export const DEFAULT_DUAL_WRITE_RETIREMENT =
  "Retire dual-write when: (1) V2_PRIMARY for ≥14 days, (2) zero dual-write divergences for 7 days, (3) data migrator checksum parity, (4) rollback drill passed. Target review date: 2026-10-01.";

export interface DualWriteOptions {
  component: MigrationComponentId;
  writeV2: () => Promise<void> | void;
  writeLegacy: () => Promise<void> | void;
  /** Optional repair after divergence (e.g. re-copy V2 → legacy). */
  repair?: () => Promise<void> | void;
  /** Retry once on transient failure. */
  retryOnce?: boolean;
  forceDual?: boolean;
  retirementCondition?: string;
}

function nowIso(): string {
  return new Date().toISOString();
}

async function tryWrite(
  label: "v2" | "legacy",
  fn: () => Promise<void> | void,
  retryOnce: boolean,
): Promise<{ ok: boolean; retried: boolean; error?: string }> {
  let retried = false;
  try {
    await fn();
    return { ok: true, retried };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!retryOnce) return { ok: false, retried, error: message };
    retried = true;
    try {
      await fn();
      return { ok: true, retried };
    } catch (err2) {
      const message2 = err2 instanceof Error ? err2.message : String(err2);
      return { ok: false, retried, error: `${label}: ${message2}` };
    }
  }
}

export class DualWriteService {
  async write(opts: DualWriteOptions): Promise<DualWriteResult> {
    const at = nowIso();
    const retirement = opts.retirementCondition ?? DEFAULT_DUAL_WRITE_RETIREMENT;
    const useDual =
      opts.forceDual ||
      (isV2FlagEnabled("ENABLE_V2_COMMANDS") && isV2FlagEnabled("ENABLE_V2_DOMAIN"));

    // Flags off → legacy write only (keep V1 working).
    if (!useDual) {
      const legacy = await tryWrite("legacy", opts.writeLegacy, opts.retryOnce ?? true);
      if (!legacy.ok) {
        recordError(opts.component, `legacy write failed: ${legacy.error}`);
      }
      const result: DualWriteResult = {
        component: opts.component,
        v2Success: false,
        legacySuccess: legacy.ok,
        divergence: legacy.ok ? null : `legacy_only_failed: ${legacy.error}`,
        retried: legacy.retried,
        repaired: false,
        at,
        retirementCondition: retirement,
      };
      recordDualWrite(result);
      return result;
    }

    const v2 = await tryWrite("v2", opts.writeV2, opts.retryOnce ?? true);
    const legacy = await tryWrite("legacy", opts.writeLegacy, opts.retryOnce ?? true);

    let divergence: string | null = null;
    let repaired = false;

    if (v2.ok !== legacy.ok) {
      divergence = `write_divergence: v2=${v2.ok} legacy=${legacy.ok}` +
        (v2.error ? `; v2Err=${v2.error}` : "") +
        (legacy.error ? `; legacyErr=${legacy.error}` : "");
      recordDivergence({
        component: opts.component,
        kind: "write",
        message: divergence,
        at,
      });

      if (opts.repair && v2.ok && !legacy.ok) {
        try {
          await opts.repair();
          repaired = true;
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          recordError(opts.component, `repair failed: ${message}`);
          divergence = `${divergence}; repair_failed: ${message}`;
        }
      }
    }

    if (!v2.ok) recordError(opts.component, `v2 write failed: ${v2.error}`);
    if (!legacy.ok) recordError(opts.component, `legacy write failed: ${legacy.error}`);

    const result: DualWriteResult = {
      component: opts.component,
      v2Success: v2.ok,
      legacySuccess: legacy.ok,
      divergence,
      retried: v2.retried || legacy.retried,
      repaired,
      at,
      retirementCondition: retirement,
    };
    recordDualWrite(result);
    return result;
  }
}

export const dualWriteService = new DualWriteService();
