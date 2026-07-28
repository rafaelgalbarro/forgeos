"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

export function RoadmapWorkspace({ snapshot }: Props) {
  const items = snapshot.roadmap ?? [];
  const empty = items.length === 0;

  return (
    <WorkspacePanelShell
      title="Roadmap"
      subtitle={`${items.length} items`}
      empty={empty}
      emptyTitle="Roadmap vacío"
      emptyDescription="Items de roadmap desde design partners o Self Evolution."
    >
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0",
            borderBottom: "1px solid var(--fhis-color-border)",
            fontSize: "0.875rem",
          }}
        >
          <div>
            <div>{item.title}</div>
            <span style={{ color: "var(--fhis-color-text-muted)", fontSize: "0.75rem" }}>{item.quarter}</span>
          </div>
          <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
            {item.votes !== undefined && item.votes > 0 && (
              <Badge variant="blue">{item.votes} votos</Badge>
            )}
            <Badge variant={item.status === "in-progress" ? "amber" : item.status === "done" ? "accent" : "default"}>
              {item.status}
            </Badge>
          </div>
        </div>
      ))}
    </WorkspacePanelShell>
  );
}
