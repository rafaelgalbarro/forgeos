"use client";

import type { KnowledgeNode } from "@/lib/knowledge-hub";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { EmptyState } from "@/components/ui/fhis/EmptyState";

interface DocumentDetailPanelProps {
  node: KnowledgeNode | null;
}

function renderContent(content: string) {
  const lines = content.split("\n");
  return lines.map((line, i) => {
    if (line.startsWith("**") && line.includes("**")) {
      const parts = line.split(/\*\*(.+?)\*\*/g);
      return (
        <p key={i} className="fhis-vws-prose">
          {parts.map((part, j) =>
            j % 2 === 1 ? <strong key={j}>{part}</strong> : part
          )}
        </p>
      );
    }
    if (line.startsWith("• ")) {
      return (
        <p key={i} className="fhis-vws-prose" style={{ marginLeft: "1rem" }}>
          {line}
        </p>
      );
    }
    if (!line.trim()) return <br key={i} />;
    return (
      <p key={i} className="fhis-vws-prose">
        {line}
      </p>
    );
  });
}

export function DocumentDetailPanel({ node }: DocumentDetailPanelProps) {
  if (!node) {
    return (
      <Panel className="fhis-kh-detail">
        <EmptyState
          icon="◇"
          title="Selecciona un documento"
          description="Elige un nodo del árbol para ver su contenido, versiones y relaciones."
        />
      </Panel>
    );
  }

  return (
    <Panel className="fhis-kh-detail">
      <SectionHeader title={node.title} subtitle={node.summary} />
      <div className="fhis-kh-detail-meta">
        <Badge variant="blue">{node.category}</Badge>
        <Badge
          variant={
            node.status === "complete"
              ? "accent"
              : node.status === "partial"
                ? "amber"
                : "default"
          }
        >
          {node.status}
        </Badge>
      </div>
      <div className="fhis-kh-detail-source">
        <span>Fuente: {node.sourceModule}</span>
        <span>Actualizado: {new Date(node.updatedAt).toLocaleString()}</span>
      </div>
      {node.tags && node.tags.length > 0 && (
        <div className="fhis-vws-tags">
          {node.tags.map((tag) => (
            <Badge key={tag} variant="default">
              {tag}
            </Badge>
          ))}
        </div>
      )}
      <div className="fhis-kh-detail-content">{renderContent(node.content)}</div>
    </Panel>
  );
}
