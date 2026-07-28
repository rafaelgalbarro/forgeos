"use client";

import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

export function NPSPanel({ snapshot }: Props) {
  const nps = snapshot.nps;
  const empty = !nps || nps.responseCount === 0;

  return (
    <WorkspacePanelShell
      title="Net Promoter Score"
      subtitle={nps ? `Score ${nps.score}` : undefined}
      empty={empty}
      emptyTitle="Sin respuestas NPS"
      emptyDescription="Las respuestas NPS aparecerán desde Customer Success."
    >
      {nps && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, fontSize: "0.875rem" }}>
          <div>
            <div style={{ fontSize: "2rem", fontWeight: 700 }}>{nps.score}</div>
            <div style={{ color: "var(--fhis-color-text-muted)" }}>NPS Score</div>
          </div>
          <div>
            <div>Promotores: {nps.promoters}</div>
            <div>Pasivos: {nps.passives}</div>
            <div>Detractores: {nps.detractors}</div>
            <div style={{ marginTop: 4, color: "var(--fhis-color-text-muted)" }}>
              {nps.responseCount} respuestas
            </div>
          </div>
        </div>
      )}
    </WorkspacePanelShell>
  );
}
