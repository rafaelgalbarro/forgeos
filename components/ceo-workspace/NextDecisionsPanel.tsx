import Link from "next/link";
import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { NextDecisionItem } from "@/lib/ceo-workspace";

const PRIORITY_VARIANT: Record<NextDecisionItem["priority"], "red" | "amber" | "blue"> = {
  alta: "red",
  media: "amber",
  baja: "blue",
};

interface NextDecisionsPanelProps {
  decisions: NextDecisionItem[];
  consensusLevel?: string;
}

export function NextDecisionsPanel({ decisions, consensusLevel }: NextDecisionsPanelProps) {
  return (
    <Panel className="ceo-ws-panel" id="ceo-proximas-decisiones">
      <SectionHeader
        title="Próximas decisiones"
        description={
          consensusLevel
            ? `Consenso del board: ${consensusLevel.replace(/_/g, " ")}`
            : "Decisiones que desbloquean el siguiente tramo"
        }
      />
      {decisions.length === 0 ? (
        <p className="ceo-ws-muted">Sin decisiones pendientes.</p>
      ) : (
        <ul className="ceo-ws-list ceo-ws-list-plain">
          {decisions.map((item) => (
            <li key={item.id} className="ceo-ws-list-item">
              <div className="ceo-ws-list-head">
                <Badge variant={PRIORITY_VARIANT[item.priority]}>{item.priority}</Badge>
                <strong>{item.decision}</strong>
              </div>
              <p className="ceo-ws-list-body">{item.context}</p>
              {item.ventureName && (
                <span className="ceo-ws-tag">{item.ventureName}</span>
              )}
              {item.href && (
                <Link href={item.href} className="ceo-ws-link">
                  Decidir →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
