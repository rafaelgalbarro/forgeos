import Link from "next/link";
import type { FounderPrioritiesSection } from "@/lib/founder-dashboard/types";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { EmptyState } from "@/components/ui/EmptyState";

interface PrioridadesPanelProps {
  prioridades: FounderPrioritiesSection;
}

const PRIORITY_VARIANT: Record<"alta" | "media" | "baja", "red" | "amber" | "default"> = {
  alta: "red",
  media: "amber",
  baja: "default",
};

const PRIORITY_LABEL: Record<"alta" | "media" | "baja", string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

export function PrioridadesPanel({ prioridades }: PrioridadesPanelProps) {
  const items = prioridades?.items ?? [];

  return (
    <Panel className="fhis-founder-panel" id="founder-prioridades">
      <SectionHeader title="Prioridades" subtitle={prioridades?.headline ?? "Sin prioridades activas"} />
      {items.length === 0 ? (
        <EmptyState
          icon="◎"
          title="Sin prioridades"
          description="Las prioridades aparecerán cuando tengas ventures activos."
        />
      ) : (
      <ul className="fhis-founder-list">
        {items.map((item) => (
          <li key={item.id}>
            <Link href={item.href} className="fhis-founder-priority-item">
              <div className="fhis-founder-priority-head">
                <strong>{item.label}</strong>
                <Badge variant={PRIORITY_VARIANT[item.priority]}>
                  {PRIORITY_LABEL[item.priority]}
                </Badge>
              </div>
              {item.ventureName && (
                <span className="fhis-founder-priority-venture">{item.ventureName}</span>
              )}
              <p className="fhis-founder-priority-rationale">{item.rationale}</p>
              <span className="fhis-founder-priority-time">{item.estimatedTime}</span>
            </Link>
          </li>
        ))}
      </ul>
      )}
    </Panel>
  );
}
