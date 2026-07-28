"use client";

import type { FounderAdvisorOutput } from "@/lib/intelligence/types";
import { CeoCard } from "@/components/ui/fhis/CeoCard";
import { Panel } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";

interface FounderAdvisorPanelProps {
  advisor: FounderAdvisorOutput | null;
}

export function FounderAdvisorPanel({ advisor }: FounderAdvisorPanelProps) {
  if (!advisor) return null;

  return (
    <Panel className="founder-panel">
      <SectionHeader title="Founder Advisor" description="Tu cofundador virtual" />

      <CeoCard title={advisor.headline} subtitle="Análisis en tiempo real">
        <p style={{ margin: 0, lineHeight: 1.6 }}>{advisor.summary}</p>
      </CeoCard>

      {advisor.risks.length > 0 && (
        <div className="founder-block">
          <span className="founder-block-label">Riesgos</span>
          <ul>
            {advisor.risks.slice(0, 3).map((r) => (
              <li key={r.title}><strong>{r.title}</strong> — {r.description}</li>
            ))}
          </ul>
        </div>
      )}

      {advisor.opportunities.length > 0 && (
        <div className="founder-block founder-block-opportunity">
          <span className="founder-block-label">Oportunidades</span>
          <ul>
            {advisor.opportunities.map((o) => (
              <li key={o.title}><strong>{o.title}</strong> — {o.description}</li>
            ))}
          </ul>
        </div>
      )}

      {advisor.questions.length > 0 && (
        <div className="founder-block">
          <span className="founder-block-label">Preguntas clave</span>
          <ul>
            {advisor.questions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ul>
        </div>
      )}

      {advisor.recommendations.length > 0 && (
        <div className="founder-block">
          <span className="founder-block-label">Recomendaciones</span>
          <ul className="founder-recommendations-list">
            {advisor.recommendations.map((rec) => (
              <li key={rec.text}>
                <strong>{rec.text}</strong>
                <span className="intelligence-rationale">Motivo: {rec.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {advisor.shouldCompare && (
        <p className="founder-cta-text">
          ¿Quieres comparar alternativas antes de construir el producto?
        </p>
      )}
    </Panel>
  );
}
