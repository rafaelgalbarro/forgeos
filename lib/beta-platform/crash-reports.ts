import type { CrashReport, CrashSeverity } from "./types";
import { isCrashReportsEnabled } from "./config";
import { readStorage, writeStorage } from "./storage";
import { trackBetaEvent } from "./analytics";

const STORAGE_KEY = "forgeos-beta-crash-reports";
const MAX_REPORTS = 100;

let memoryReports: CrashReport[] = [];
let captureInstalled = false;

function read(): CrashReport[] {
  if (typeof window === "undefined") return memoryReports;
  const stored = readStorage<CrashReport[]>(STORAGE_KEY, []);
  memoryReports = stored;
  return memoryReports;
}

function write(reports: CrashReport[]): void {
  const trimmed = reports.slice(-MAX_REPORTS);
  memoryReports = trimmed;
  writeStorage(STORAGE_KEY, trimmed);
}

export function listCrashReports(): CrashReport[] {
  return read();
}

export function getCrashReportCount(): number {
  return read().length;
}

export function submitCrashReport(input: {
  message: string;
  stack?: string;
  page: string;
  userId?: string;
  severity?: CrashSeverity;
}): CrashReport | null {
  if (!isCrashReportsEnabled()) return null;

  const report: CrashReport = {
    id: `cr-${Date.now()}`,
    message: input.message,
    stack: input.stack,
    page: input.page,
    userId: input.userId,
    severity: input.severity ?? "medium",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : undefined,
    createdAt: new Date().toISOString(),
  };

  write([...read(), report]);
  trackBetaEvent({
    event: "crash_report",
    path: input.page,
    userId: input.userId,
    meta: { severity: report.severity },
  });

  return report;
}

/** Client-side error capture stub — hooks window.onerror */
export function installCrashCapture(page: string, userId?: string): () => void {
  if (typeof window === "undefined" || !isCrashReportsEnabled() || captureInstalled) {
    return () => {};
  }

  captureInstalled = true;

  const onError = (message: string | Event, source?: string, lineno?: number, colno?: number, error?: Error) => {
    const msg = typeof message === "string" ? message : "Unknown error";
    submitCrashReport({
      message: `${msg} (${source ?? "unknown"}:${lineno ?? 0}:${colno ?? 0})`,
      stack: error?.stack,
      page,
      userId,
      severity: "high",
    });
  };

  const onRejection = (event: PromiseRejectionEvent) => {
    submitCrashReport({
      message: `Unhandled rejection: ${String(event.reason)}`,
      stack: event.reason instanceof Error ? event.reason.stack : undefined,
      page,
      userId,
      severity: "medium",
    });
  };

  window.addEventListener("error", onError as EventListener);
  window.addEventListener("unhandledrejection", onRejection);

  return () => {
    window.removeEventListener("error", onError as EventListener);
    window.removeEventListener("unhandledrejection", onRejection);
    captureInstalled = false;
  };
}

export function clearCrashReports(): void {
  memoryReports = [];
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
}
