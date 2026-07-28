import Link from "next/link";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { PriorityItem } from "@/lib/ceo-workspace";

interface PrioritiesPanelProps {
  priorities: PriorityItem[];
}

export function PrioritiesPanel({ priorities }: PrioritiesPanelProps) {
  return (
    <Panel className="ceo-ws-panel" id="ceo-prioridades">
      <SectionHeader title="Prioridades" description="Ordenadas por impacto y urgencia" />
      {priorities.length === 0 ? (
        <p className="ceo-ws-muted">Sin prioridades activas.</p>
      ) : (
        <ol className="ceo-ws-list">
          {priorities.map((item, index) => (
            <li key={item.id} className="ceo-ws-list-item">
              <div className="ceo-ws-list-head">
                <Badge variant="accent">{index + 1}</Badge>
                <strong>{item.label}</strong>
              </div>
              <p className="ceo-ws-list-body">{item.rationale}</p>
              {item.ventureName && (
                <span className="ceo-ws-tag">{item.ventureName}</span>
              )}
              {item.href && (
                <Link href={item.href} className="ceo-ws-link">
                  Abrir →
                </Link>
              )}
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
