"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

function trendVariant(trend?: "up" | "down" | "stable"): "accent" | "red" | "default" {
  if (trend === "up") return "accent";
  if (trend === "down") return "red";
  return "default";
}

export function KPIsPanel({ snapshot }: Props) {
  const kpis = snapshot.kpis ?? [];
  const empty = kpis.length === 0;

  return (
    <WorkspacePanelShell
      title="KPIs"
      subtitle={`${kpis.length} indicadores`}
      empty={empty}
      emptyTitle="Sin KPIs"
      emptyDescription="KPIs desde Customer Success y métricas de negocio."
    >
      {kpis.map((k) => (
        <div
          key={k.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0",
            borderBottom: "1px solid var(--fhis-color-border)",
            fontSize: "0.875rem",
          }}
        >
          <span>{k.label}</span>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <strong>
              {k.value}
              {k.unit ?? ""}
            </strong>
            {k.trend && <Badge variant={trendVariant(k.trend)}>{k.trend}</Badge>}
          </div>
        </div>
      ))}
    </WorkspacePanelShell>
  );
}
