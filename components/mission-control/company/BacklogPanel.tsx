"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

function priorityVariant(p: string): "red" | "amber" | "default" {
  if (p === "critical" || p === "high") return "red";
  if (p === "medium") return "amber";
  return "default";
}

export function BacklogPanel({ snapshot }: Props) {
  const items = snapshot.backlog ?? [];
  const empty = items.length === 0;

  return (
    <WorkspacePanelShell
      title="Backlog"
      subtitle={`${items.length} items`}
      empty={empty}
      emptyTitle="Backlog vacío"
      emptyDescription="Items guardados por misión en localStorage."
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
          <span>{item.title}</span>
          <div style={{ display: "flex", gap: 4 }}>
            <Badge variant={priorityVariant(item.priority)}>{item.priority}</Badge>
            <Badge variant={item.status === "in_progress" ? "amber" : item.status === "done" ? "accent" : "default"}>
              {item.status}
            </Badge>
          </div>
        </div>
      ))}
    </WorkspacePanelShell>
  );
}
