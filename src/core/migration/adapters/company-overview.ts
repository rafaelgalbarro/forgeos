/**
 * Flow J — Company overview adapter (NOT_STARTED).
 * Blocked until ENABLE_V2_COMPANY_OS has a real V2 Company OS aggregate.
 */

export interface CompanyOverviewDto {
  workspaceCount: number;
  labels: string[];
  updatedAt: string;
}

export const COMPANY_OVERVIEW_ADAPTER_STATUS = "NOT_STARTED" as const;
export const COMPANY_OVERVIEW_STUB_NOTE =
  "Stub — legacy lib/mission-control/autonomous-company remains sole source. V2 gap: Workspace/Venture only.";

export function fromLegacyCompanySnapshot(s: {
  workspaces?: Array<{ id?: string; label?: string; name?: string }>;
  updatedAt?: string;
}): CompanyOverviewDto {
  const workspaces = s.workspaces ?? [];
  return {
    workspaceCount: workspaces.length,
    labels: workspaces.map((w) => w.label || w.name || w.id || "workspace"),
    updatedAt: s.updatedAt || new Date(0).toISOString(),
  };
}
