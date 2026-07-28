"use client";

import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

export function ProductMetricsPanel({ snapshot }: Props) {
  const m = snapshot.productMetrics;
  const empty = !m || m.totalEvents === 0;

  return (
    <WorkspacePanelShell
      title="Product Metrics"
      subtitle={m ? `${m.totalEvents} eventos totales` : undefined}
      empty={empty}
      emptyTitle="Sin métricas de producto"
      emptyDescription="Eventos de design partners y beta platform."
    >
      {m && (
        <div style={{ fontSize: "0.875rem" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
            <div>Design Partners: {m.dpEventCount}</div>
            <div>Beta: {m.betaEventCount}</div>
          </div>
          {m.topPaths.length > 0 && (
            <>
              <strong>Top paths</strong>
              {m.topPaths.map((p) => (
                <div key={p.path} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                  <span>{p.path}</span>
                  <span>{p.count}</span>
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </WorkspacePanelShell>
  );
}
