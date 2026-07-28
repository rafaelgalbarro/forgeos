import Link from "next/link";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import type { RecommendationItem } from "@/lib/ceo-workspace";

interface RecommendationsPanelProps {
  recommendations: RecommendationItem[];
}

export function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  return (
    <Panel className="ceo-ws-panel" id="ceo-recomendaciones">
      <SectionHeader title="Recomendaciones" description="Acciones sugeridas por el Director General" />
      {recommendations.length === 0 ? (
        <p className="ceo-ws-muted">Sin recomendaciones pendientes.</p>
      ) : (
        <ul className="ceo-ws-list ceo-ws-list-plain">
          {recommendations.map((rec) => (
            <li key={rec.id} className="ceo-ws-list-item">
              <strong>{rec.action}</strong>
              <p className="ceo-ws-list-body">{rec.rationale}</p>
              <p className="ceo-ws-impact">Impacto: {rec.expectedImpact}</p>
              {rec.href && (
                <Link href={rec.href} className="ceo-ws-link">
                  Ejecutar →
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
