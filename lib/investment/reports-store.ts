import "server-only";

import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";
import type {
  InvestmentPeriodReport,
  ReportHistoryIndex,
  ReportListFilters,
  ReportListItem,
  ReportPeriodType,
} from "@/lib/investment/reports-types";
import { filterReportItems, toReportListItem } from "@/lib/investment/reports-export";

const REPORTS_REL = path.join(".forgeos", "investment", "reports");
const INDEX_NAME = "index.json";

function reportsDir(cwd = process.cwd()): string {
  return path.join(cwd, REPORTS_REL);
}

function indexPath(cwd = process.cwd()): string {
  return path.join(reportsDir(cwd), INDEX_NAME);
}

function reportFilePath(id: string, cwd = process.cwd()): string {
  const safe = id.replace(/[^a-zA-Z0-9._-]/g, "_");
  return path.join(reportsDir(cwd), `${safe}.json`);
}

function emptyIndex(): ReportHistoryIndex {
  return {
    updatedAt: new Date().toISOString(),
    mode: "ANALYSIS_ONLY",
    orderExecution: "disabled",
    ids: [],
  };
}

function ensureDir(cwd = process.cwd()): void {
  const dir = reportsDir(cwd);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

function readIndex(cwd = process.cwd()): ReportHistoryIndex {
  const file = indexPath(cwd);
  if (!existsSync(file)) return emptyIndex();
  try {
    const raw = JSON.parse(readFileSync(file, "utf8")) as Partial<ReportHistoryIndex>;
    return {
      updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      ids: Array.isArray(raw.ids)
        ? raw.ids.filter((x): x is string => typeof x === "string")
        : [],
    };
  } catch {
    return emptyIndex();
  }
}

/** Atomic-ish write: temp + rename. Never truncates index without merge. */
function writeIndex(index: ReportHistoryIndex, cwd = process.cwd()): void {
  ensureDir(cwd);
  const file = indexPath(cwd);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(index, null, 2), "utf8");
  renameSync(tmp, file);
}

/**
 * Append-only persist. Refuses to overwrite an existing report id.
 * Index is append-only for ids (duplicates skipped).
 */
export function appendReport(
  report: InvestmentPeriodReport,
  options?: { readonly cwd?: string },
): InvestmentPeriodReport {
  const cwd = options?.cwd ?? process.cwd();
  ensureDir(cwd);
  const file = reportFilePath(report.id, cwd);
  if (existsSync(file)) {
    throw new Error(`IMMUTABLE_REFUSAL: report ${report.id} already exists — never overwrite`);
  }
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(report, null, 2), "utf8");
  renameSync(tmp, file);

  const index = readIndex(cwd);
  const ids = index.ids.includes(report.id) ? index.ids : [...index.ids, report.id];
  writeIndex(
    {
      updatedAt: new Date().toISOString(),
      mode: "ANALYSIS_ONLY",
      orderExecution: "disabled",
      ids,
    },
    cwd,
  );
  return report;
}

export function loadReport(
  id: string,
  options?: { readonly cwd?: string },
): InvestmentPeriodReport | null {
  const cwd = options?.cwd ?? process.cwd();
  const file = reportFilePath(id, cwd);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf8")) as InvestmentPeriodReport;
  } catch {
    return null;
  }
}

export function listReportItems(
  filters?: ReportListFilters,
  options?: { readonly cwd?: string },
): { readonly total: number; readonly items: readonly ReportListItem[] } {
  const cwd = options?.cwd ?? process.cwd();
  const index = readIndex(cwd);
  const items: ReportListItem[] = [];
  for (const id of index.ids) {
    const report = loadReport(id, { cwd });
    if (report) items.push(toReportListItem(report));
  }
  const filtered = filterReportItems(items, filters ?? {});
  return { total: items.length, items: filtered };
}

export function countVersionsForPeriod(
  periodType: ReportPeriodType,
  periodKey: string,
  options?: { readonly cwd?: string },
): number {
  const { items } = listReportItems({ periodType, periodKey, limit: 10_000 }, options);
  return items.length;
}

export function latestForPeriod(
  periodType: ReportPeriodType,
  periodKey: string,
  options?: { readonly cwd?: string },
): InvestmentPeriodReport | null {
  const { items } = listReportItems({ periodType, periodKey, limit: 1 }, options);
  const head = items[0];
  if (!head) return null;
  return loadReport(head.id, options);
}

export function reportsStorePath(cwd = process.cwd()): string {
  return reportsDir(cwd);
}
