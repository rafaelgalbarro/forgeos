"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { Badge } from "@/components/ui/fhis/Badge";
import { listCrashReports } from "@/lib/beta-platform";
import type { CrashReport } from "@/lib/beta-platform";

interface CrashReportsPanelProps {
  reportCount: number;
}

const SEVERITY_VARIANT: Record<CrashReport["severity"], "default" | "amber" | "red" | "accent"> = {
  low: "default",
  medium: "amber",
  high: "red",
  critical: "red",
};

export function CrashReportsPanel({ reportCount }: CrashReportsPanelProps) {
  const reports: CrashReport[] =
    typeof window !== "undefined" ? listCrashReports().slice(-8).reverse() : [];

  return (
    <Stack gap="md">
      <Panel className="fhis-beta-analytics-summary">
        <span className="fhis-beta-stat-value">{reportCount}</span>
        <span className="fhis-beta-stat-label">crash reports capturados (stub)</span>
      </Panel>
      {reports.length === 0 ? (
        <p className="fhis-beta-empty">Sin crash reports. El capturador está activo si ENABLE_CRASH_REPORTS=true.</p>
      ) : (
        <Stack gap="sm">
          {reports.map((report) => (
            <Panel key={report.id} className="fhis-beta-crash-row">
              <div className="fhis-beta-crash-head">
                <Badge variant={SEVERITY_VARIANT[report.severity]}>{report.severity}</Badge>
                <time className="fhis-beta-analytics-time">
                  {new Date(report.createdAt).toLocaleString("es-ES")}
                </time>
              </div>
              <p className="fhis-beta-crash-msg">{report.message}</p>
              <p className="fhis-beta-crash-page">{report.page}</p>
            </Panel>
          ))}
        </Stack>
      )}
    </Stack>
  );
}
