"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

function severityVariant(s: string): "red" | "amber" | "default" {
  if (s === "critical" || s === "error") return "red";
  if (s === "warning") return "amber";
  return "default";
}

export function IncidentsPanel({ snapshot }: Props) {
  const items = snapshot.incidents ?? [];
  const empty = items.length === 0;

  return (
    <WorkspacePanelShell
      title="Incidentes"
      subtitle={`${items.length} incidentes`}
      empty={empty}
      emptyTitle="Sin incidentes"
      emptyDescription="Tracker desde Production Readiness."
    >
      {items.map((inc) => (
        <div
          key={inc.id}
          style={{
            padding: "8px 0",
            borderBottom: "1px solid var(--fhis-color-border)",
            fontSize: "0.875rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <strong>{inc.title}</strong>
            <div style={{ display: "flex", gap: 4 }}>
              <Badge variant={severityVariant(inc.severity)}>{inc.severity}</Badge>
              <Badge variant={inc.status === "open" ? "red" : "default"}>{inc.status}</Badge>
            </div>
          </div>
          {inc.description && (
            <p style={{ margin: 0, color: "var(--fhis-color-text-muted)", fontSize: "0.75rem" }}>
              {inc.description.slice(0, 100)}
            </p>
          )}
        </div>
      ))}
    </WorkspacePanelShell>
  );
}
