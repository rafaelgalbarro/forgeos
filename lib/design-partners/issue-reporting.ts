import type { IssueReport, IssueSeverity, IssueStatus } from "./types";
import { readStorage, writeStorage } from "./storage";
import { trackDesignPartnerEvent } from "./analytics";

const STORAGE_KEY = "forgeos-dp-issues";

let memoryIssues: IssueReport[] = [];

function read(): IssueReport[] {
  if (typeof window === "undefined") return memoryIssues;
  const stored = readStorage<IssueReport[]>(STORAGE_KEY, []);
  memoryIssues = stored;
  return memoryIssues;
}

function write(records: IssueReport[]): void {
  memoryIssues = records;
  writeStorage(STORAGE_KEY, records);
}

export function listIssueReports(): IssueReport[] {
  return read();
}

export function getIssueCount(): number {
  return read().length;
}

export function submitIssueReport(input: {
  title: string;
  description: string;
  severity?: IssueSeverity;
  page: string;
  userId?: string;
  workspaceId?: string;
  email?: string;
}): IssueReport {
  const now = new Date().toISOString();
  const record: IssueReport = {
    id: `dpi-${Date.now()}`,
    title: input.title.trim(),
    description: input.description.trim(),
    severity: input.severity ?? "medium",
    status: "open",
    page: input.page,
    userId: input.userId,
    workspaceId: input.workspaceId,
    email: input.email,
    createdAt: now,
    updatedAt: now,
  };
  write([...read(), record]);
  trackDesignPartnerEvent({
    event: "dp_issue_report",
    path: input.page,
    userId: input.userId,
    workspaceId: input.workspaceId,
    meta: { severity: record.severity },
  });
  return record;
}

export function updateIssueStatus(id: string, status: IssueStatus): IssueReport | null {
  const issues = read();
  const idx = issues.findIndex((i) => i.id === id);
  if (idx === -1) return null;
  issues[idx] = { ...issues[idx], status, updatedAt: new Date().toISOString() };
  write(issues);
  return issues[idx];
}
