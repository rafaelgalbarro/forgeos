/** Recovery utilities for corrupted persistence data. */

import { getLocalAdapter } from "../adapters/local-adapter";
import { PERSISTENCE_KEYS } from "../types";

export interface RecoveryReport {
  checked: number;
  corrupted: string[];
  repaired: string[];
  failed: string[];
}

const ALL_KEYS = Object.values(PERSISTENCE_KEYS);

function isValidJson(raw: string): boolean {
  try {
    JSON.parse(raw);
    return true;
  } catch {
    return false;
  }
}

/** Scan all persistence keys and report corruption. */
export async function scanForCorruption(): Promise<RecoveryReport> {
  const report: RecoveryReport = {
    checked: 0,
    corrupted: [],
    repaired: [],
    failed: [],
  };

  if (typeof window === "undefined") return report;

  for (const key of ALL_KEYS) {
    report.checked++;
    const raw = localStorage.getItem(key);
    if (raw === null) continue;

    if (!isValidJson(raw)) {
      report.corrupted.push(key);
    }
  }

  return report;
}

/** Attempt to repair corrupted keys by removing invalid data. */
export async function repairCorruptedKeys(): Promise<RecoveryReport> {
  const scan = await scanForCorruption();
  const adapter = getLocalAdapter();

  for (const key of scan.corrupted) {
    try {
      await adapter.remove(key);
      scan.repaired.push(key);
    } catch {
      scan.failed.push(key);
    }
  }

  return scan;
}

/** Export all persistence data for backup. */
export async function exportAllData(): Promise<Record<string, unknown>> {
  const adapter = getLocalAdapter();
  const data: Record<string, unknown> = {};

  for (const key of ALL_KEYS) {
    data[key] = await adapter.read(key, null);
  }

  return data;
}

/** Import persistence data from a backup object. */
export async function importAllData(
  data: Record<string, unknown>
): Promise<number> {
  const adapter = getLocalAdapter();
  let imported = 0;

  for (const [key, value] of Object.entries(data)) {
    if (ALL_KEYS.includes(key as (typeof ALL_KEYS)[number])) {
      await adapter.write(key, value);
      imported++;
    }
  }

  return imported;
}
