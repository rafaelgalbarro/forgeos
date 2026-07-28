"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

export function MarketingWorkspace({ snapshot }: Props) {
  const data = snapshot.marketing;
  const empty = !data || data.campaigns.length === 0;

  return (
    <WorkspacePanelShell
      title="Marketing"
      subtitle={data?.headline}
      empty={empty}
      emptyTitle="Marketing sin campañas"
      emptyDescription="Activa agentes de marketing desde el marketplace."
    >
      {data && (
        <div style={{ fontSize: "0.875rem" }}>
          {data.agentCount !== undefined && (
            <p style={{ marginBottom: 8, color: "var(--fhis-color-text-muted)" }}>
              {data.agentCount} agente(s) de marketing disponibles
            </p>
          )}
          {data.campaigns.map((c) => (
            <div
              key={c.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "8px 0",
                borderBottom: "1px solid var(--fhis-color-border)",
              }}
            >
              <span>{c.name}</span>
              <Badge variant={c.status === "active" ? "accent" : "default"}>{c.status}</Badge>
            </div>
          ))}
          {data.channels.length > 0 && (
            <p style={{ marginTop: 12, color: "var(--fhis-color-text-muted)" }}>
              Canales: {data.channels.join(", ")}
            </p>
          )}
        </div>
      )}
    </WorkspacePanelShell>
  );
}
