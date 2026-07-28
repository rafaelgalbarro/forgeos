"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import type { CompanyWorkspacesSnapshot } from "@/lib/mission-control/autonomous-company/types";
import { WorkspacePanelShell } from "./WorkspacePanelShell";

interface Props {
  snapshot: CompanyWorkspacesSnapshot;
}

export function SEOWorkspace({ snapshot }: Props) {
  const data = snapshot.seo;
  const empty = !data || data.score === 0;

  return (
    <WorkspacePanelShell
      title="SEO"
      subtitle={data ? `Score ${data.score}/100` : undefined}
      empty={empty}
      emptyTitle="SEO sin métricas"
      emptyDescription="Conecta agentes SEO para estrategia y métricas."
    >
      {data && (
        <div style={{ fontSize: "0.875rem" }}>
          {data.strategyNote && (
            <p style={{ marginBottom: 12, color: "var(--fhis-color-text-muted)" }}>{data.strategyNote}</p>
          )}
          <p style={{ marginBottom: 8 }}>
            <strong>Páginas indexadas:</strong> {data.indexedPages}
          </p>
          {data.keywords.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <strong>Keywords:</strong>{" "}
              {data.keywords.map((k) => (
                <Badge key={k} variant="default">
                  {k}
                </Badge>
              ))}
            </div>
          )}
          {data.topQueries.map((q) => (
            <div key={q.query} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span>{q.query}</span>
              <span style={{ color: "var(--fhis-color-text-muted)" }}>{q.impressions} imp.</span>
            </div>
          ))}
        </div>
      )}
    </WorkspacePanelShell>
  );
}
