"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

export function CustomerFeedbackPanel({ snapshot }: Props) {
  const items = snapshot.feedback ?? [];
  const empty = items.length === 0;

  return (
    <WorkspacePanelShell
      title="Customer Feedback"
      subtitle={`${items.length} entradas`}
      empty={empty}
      emptyTitle="Sin feedback"
      emptyDescription="Feedback de design partners, beta e issues."
    >
      {items.map((f) => (
        <div
          key={f.id}
          style={{
            padding: "8px 0",
            borderBottom: "1px solid var(--fhis-color-border)",
            fontSize: "0.875rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <strong>{f.title}</strong>
            <Badge variant="default">{f.source}</Badge>
          </div>
          <p style={{ margin: 0, color: "var(--fhis-color-text-muted)" }}>{f.message.slice(0, 120)}</p>
        </div>
      ))}
    </WorkspacePanelShell>
  );
}
