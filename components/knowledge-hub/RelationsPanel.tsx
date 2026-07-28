"use client";

import type { DocumentTree, KnowledgeRelation } from "@/lib/knowledge-hub";
import { getNodeById } from "@/lib/knowledge-hub";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface RelationsPanelProps {
  relations: KnowledgeRelation[];
  tree: DocumentTree;
  selectedNodeId: string | null;
  onSelectNode: (nodeId: string) => void;
}

const RELATION_LABELS: Record<KnowledgeRelation["relationType"], string> = {
  "derived-from": "Derivado de",
  references: "Referencia",
  informs: "Informa",
  "depends-on": "Depende de",
  related: "Relacionado",
};

export function RelationsPanel({
  relations,
  tree,
  selectedNodeId,
  onSelectNode,
}: RelationsPanelProps) {
  const nodeRelations = selectedNodeId
    ? relations.filter(
        (r) => r.fromNodeId === selectedNodeId || r.toNodeId === selectedNodeId
      )
    : [];

  return (
    <Panel className="fhis-kh-side-panel">
      <SectionHeader
        title="Relaciones"
        subtitle={
          selectedNodeId
            ? `${nodeRelations.length} vínculo${nodeRelations.length === 1 ? "" : "s"}`
            : "Documentos vinculados"
        }
      />
      {!selectedNodeId ? (
        <EmptyState
          icon="◇"
          title="Sin selección"
          description="Las relaciones aparecen al seleccionar un documento."
        />
      ) : nodeRelations.length === 0 ? (
        <EmptyState
          icon="◇"
          title="Sin relaciones"
          description="Este documento no tiene vínculos cruzados definidos."
        />
      ) : (
        <ul className="fhis-kh-relation-list">
          {nodeRelations.map((rel) => {
            const otherId =
              rel.fromNodeId === selectedNodeId ? rel.toNodeId : rel.fromNodeId;
            const other = getNodeById(tree, otherId);
            const direction =
              rel.fromNodeId === selectedNodeId ? "outgoing" : "incoming";

            return (
              <li key={rel.id} className="fhis-kh-relation-item">
                <Badge variant="blue">{RELATION_LABELS[rel.relationType]}</Badge>
                <p className="fhis-kh-relation-label">{rel.label}</p>
                <button
                  type="button"
                  className="fhis-kh-relation-link"
                  onClick={() => onSelectNode(otherId)}
                >
                  {direction === "outgoing" ? "→" : "←"} {other?.title ?? otherId}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}
