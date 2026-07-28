"use client";

import type { KnowledgeVersion } from "@/lib/knowledge-hub";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface VersionHistoryPanelProps {
  versions: KnowledgeVersion[];
  nodeTitle?: string;
}

export function VersionHistoryPanel({ versions, nodeTitle }: VersionHistoryPanelProps) {
  return (
    <Panel className="fhis-kh-side-panel">
      <SectionHeader
        title="Versiones"
        subtitle={nodeTitle ? `Historial de ${nodeTitle}` : "Selecciona un documento"}
      />
      {versions.length === 0 ? (
        <EmptyState icon="◇" title="Sin versiones" description="No hay historial para este nodo." />
      ) : (
        <ul className="fhis-kh-version-list">
          {versions.map((v) => (
            <li key={v.id} className="fhis-kh-version-item">
              <div className="fhis-kh-version-head">
                <Badge variant={v.label === "Current" ? "accent" : "default"}>
                  v{v.version}
                </Badge>
                <span className="fhis-kh-version-label">{v.label}</span>
              </div>
              <p className="fhis-kh-version-summary">{v.summary}</p>
              <div className="fhis-kh-version-meta">
                <span>{new Date(v.createdAt).toLocaleString()}</span>
                <span>{v.source}</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
