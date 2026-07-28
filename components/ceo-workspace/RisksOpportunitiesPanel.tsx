import { Badge } from "@/components/ui/fhis/Badge";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { RiskItem } from "@/lib/ceo-workspace";

const SEVERITY_VARIANT: Record<RiskItem["severity"], "red" | "amber" | "blue"> = {
  critical: "red",
  high: "amber",
  medium: "blue",
};

const SEVERITY_LABEL: Record<RiskItem["severity"], string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
};

interface RisksOpportunitiesPanelProps {
  risks: RiskItem[];
  opportunities: import("@/lib/ceo-workspace").OpportunityItem[];
}

export function RisksOpportunitiesPanel({ risks, opportunities }: RisksOpportunitiesPanelProps) {
  return (
    <div className="ceo-ws-split">
      <Panel className="ceo-ws-panel" id="ceo-riesgos">
        <SectionHeader title="Riesgos" description="Señales que requieren atención" />
        {risks.length === 0 ? (
          <p className="ceo-ws-muted">Sin riesgos críticos detectados.</p>
        ) : (
          <ul className="ceo-ws-list ceo-ws-list-plain">
            {risks.map((risk) => (
              <li key={risk.id} className="ceo-ws-list-item">
                <div className="ceo-ws-list-head">
                  <Badge variant={SEVERITY_VARIANT[risk.severity]}>
                    {SEVERITY_LABEL[risk.severity]}
                  </Badge>
                  <span>{risk.label}</span>
                </div>
                {risk.ventureName && (
                  <span className="ceo-ws-tag">{risk.ventureName}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="ceo-ws-panel" id="ceo-oportunidades">
        <SectionHeader title="Oportunidades" description="Palancas de crecimiento" />
        {opportunities.length === 0 ? (
          <p className="ceo-ws-muted">Sin oportunidades destacadas.</p>
        ) : (
          <ul className="ceo-ws-list ceo-ws-list-plain">
            {opportunities.map((opp) => (
              <li key={opp.id} className="ceo-ws-list-item">
                <strong>{opp.label}</strong>
                <p className="ceo-ws-list-body">{opp.impact}</p>
                {opp.ventureName && (
                  <span className="ceo-ws-tag">{opp.ventureName}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
