"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import type {
  NetworkInsight,
  NetworkRecommendation,
  MarketSignal,
  NetworkOpportunity,
} from "@/lib/network/types";

interface Props {
  insights: NetworkInsight[];
  recommendations: NetworkRecommendation[];
  signals: MarketSignal[];
  opportunities: NetworkOpportunity[];
}

function priorityVariant(p: "high" | "medium" | "low"): "accent" | "amber" | "default" {
  if (p === "high") return "accent";
  if (p === "medium") return "amber";
  return "default";
}

export function InsightsPanel({ insights, recommendations, signals, opportunities }: Props) {
  return (
    <div className="fhis-network-insights-stack">
      <Card>
        <div className="fhis-network-panel-header">
          <h3>Insights de red</h3>
          <Badge variant="accent">Colectivo</Badge>
        </div>
        <ul className="fhis-network-insight-list">
          {insights.map((ins) => (
            <li key={ins.id} className="fhis-network-insight-item">
              <Badge variant={priorityVariant(ins.priority)}>{ins.type}</Badge>
              <div>
                <strong>{ins.headline}</strong>
                <p>{ins.detail}</p>
              </div>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <div className="fhis-network-panel-header">
          <h3>Recomendaciones</h3>
        </div>
        <ul className="fhis-network-rec-list">
          {recommendations.map((rec) => (
            <li key={rec.id} className="fhis-network-rec-item">
              <strong>{rec.title}</strong>
              <p>{rec.body}</p>
              <span className="fhis-network-impact">
                Impacto estimado: <strong>{rec.impactEstimate}</strong>
              </span>
            </li>
          ))}
        </ul>
      </Card>

      <div className="fhis-network-signal-grid">
        <Card>
          <h3>Señales de mercado</h3>
          <ul className="fhis-network-signal-list">
            {signals.slice(0, 3).map((sig) => (
              <li key={sig.id}>
                <Badge variant={sig.direction === "up" ? "accent" : "default"}>
                  {sig.direction === "up" ? "↑" : sig.direction === "down" ? "↓" : "→"}
                </Badge>
                <div>
                  <strong>{sig.title}</strong>
                  <p>{sig.description}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <h3>Oportunidades</h3>
          <ul className="fhis-network-opp-list">
            {opportunities.slice(0, 3).map((opp) => (
              <li key={opp.id}>
                <strong>{opp.title}</strong>
                <p>{opp.description}</p>
                <span className="fhis-network-impact">
                  Match {opp.matchScore}/10 · +{opp.estimatedImpactPct}%
                </span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
