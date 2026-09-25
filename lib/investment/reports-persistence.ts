/**
 * Daily report binary artifacts under `.forgeos/reports/investment/daily/`.
 * JSON history lives in shared `reports-store` (`.forgeos/investment/reports/`).
 * Never overwrites prior PDF/HTML files.
 */

import "server-only";

import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";

export const DAILY_REPORT_ARTIFACTS_REL = path.join(
  ".forgeos",
  "reports",
  "investment",
  "daily",
);

export function getDailyReportsDir(cwd = process.cwd()): string {
  return path.join(cwd, DAILY_REPORT_ARTIFACTS_REL);
}

function ensureDir(dir: string): void {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

/** Unique stamp for artifact filenames: YYYY-MM-DDTHHMMSS (UTC). */
export function makeReportTimestampStamp(date = new Date()): string {
  const iso = date.toISOString();
  const day = iso.slice(0, 10);
  const h = iso.slice(11, 13);
  const m = iso.slice(14, 16);
  const s = iso.slice(17, 19);
  return `${day}T${h}${m}${s}`;
}

/**
 * Write a PDF/HTML twin under daily/ with a unique stamp filename.
 * Never overwrites — throws if path exists.
 * @returns posix-style relative path from cwd
 */
export function writeDailyArtifactFile(
  fileName: string,
  content: string | Buffer,
  cwd = process.cwd(),
): string {
  ensureDir(getDailyReportsDir(cwd));
  const rel = path.join(DAILY_REPORT_ARTIFACTS_REL, fileName);
  const full = path.join(cwd, rel);
  if (existsSync(full)) {
    throw new Error(`Artifact already exists (immutable history): ${rel}`);
  }
  writeFileSync(full, content);
  return rel.replace(/\\/g, "/");
}

/** Re-export shared store helpers used by the daily API for a single import surface. */
export {
  appendReport,
  countVersionsForPeriod,
  listReportItems,
  loadReport,
  reportsStorePath,
} from "@/lib/investment/reports-store";
