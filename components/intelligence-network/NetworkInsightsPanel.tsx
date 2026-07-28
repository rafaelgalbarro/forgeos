"use client";

import { Badge } from "@/components/ui/fhis/Badge";
import { Card } from "@/components/ui/fhis/Card";
import type {
  ExecutiveInsight,
  AiRecommendation,
  OpportunitySignal,
} from "@/lib/intelligence-network";
import { getRecommendationSourceLabel } from "@/lib/intelligence-network";
import type { MarketSignal, NetworkInsight } from "@/lib/network/types";

interface Props {
  insights: NetworkInsight[];
  executiveInsights?: ExecutiveInsight[];
  recommendations: AiRecommendation[];
  signals: MarketSignal[];
  opportunities: OpportunitySignal[];
}

export function NetworkInsightsPanel({
  insights,
  executiveInsights = [],
  recommendations,
  signals,
  opportunities,
}: Props) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
      <Card>
        <h3>Insights ejecutivos</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
          {executiveInsights.map((ins) => (
            <li key={ins.id} style={{ marginBottom: "0.75rem" }}>
              <Badge variant={ins.priority === "critical" ? "amber" : "accent"}>{ins.priority}</Badge>{" "}
              <strong>{ins.headline}</strong>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem", opacity: 0.85 }}>{ins.narrative}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3>Recomendaciones</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
          {recommendations.map((rec) => (
            <li key={rec.id} style={{ marginBottom: "0.75rem" }}>
              <strong>{rec.title}</strong>
              <Badge variant="default">{getRecommendationSourceLabel(rec.source)}</Badge>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.9rem" }}>{rec.body}</p>
              <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>Impacto: {rec.impactEstimate}</span>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3>Señales de mercado</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
          {signals.map((sig) => (
            <li key={sig.id} style={{ marginBottom: "0.5rem" }}>
              <Badge variant={sig.strength === "strong" ? "accent" : "default"}>{sig.strength}</Badge>{" "}
              {sig.title}
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h3>Oportunidades</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
          {opportunities.map((opp) => (
            <li key={opp.id} style={{ marginBottom: "0.5rem" }}>
              <strong>{opp.title}</strong> — match {opp.matchScore}%
              <Badge variant="default">{opp.signalType}</Badge>
            </li>
          ))}
        </ul>
      </Card>

      <Card style={{ gridColumn: "1 / -1" }}>
        <h3>Insights de red</h3>
        <ul style={{ listStyle: "none", padding: 0, margin: "1rem 0 0" }}>
          {insights.map((ins) => (
            <li key={ins.id} style={{ marginBottom: "0.5rem" }}>
              <Badge variant={ins.priority === "high" ? "accent" : "default"}>{ins.type}</Badge>{" "}
              {ins.headline}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
