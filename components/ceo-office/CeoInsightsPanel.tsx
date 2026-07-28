"use client";

import Link from "next/link";
import type { CeoEngineOutput } from "@/lib/ceo";

interface CeoInsightsPanelProps {
  ceo: CeoEngineOutput;
}

export function CeoInsightsPanel({ ceo }: CeoInsightsPanelProps) {
  const { executiveSummary, criticalRisks, topOpportunities, recommendation } = ceo;

  return (
    <section className="ceo-insights-panel glass">
      <div className="ceo-section-head">
        <h2>AI CEO Insights</h2>
        <span className="ceo-insights-badge">Heurístico</span>
      </div>

      <p className="ceo-insights-message">{executiveSummary.ceoMessage}</p>

      <div className="ceo-insights-metrics">
        <div className="ceo-insight-metric">
          <span className="ceo-insight-label">Impact Score</span>
          <span className="ceo-insight-value">{executiveSummary.impactScore}</span>
        </div>
        <div className="ceo-insight-metric">
          <span className="ceo-insight-label">Confidence</span>
          <span className="ceo-insight-value">{executiveSummary.confidence}%</span>
        </div>
        <div className="ceo-insight-metric">
          <span className="ceo-insight-label">Risk</span>
          <span className="ceo-insight-value ceo-insight-risk">{executiveSummary.risk}%</span>
        </div>
      </div>

      <div className="ceo-insights-grid">
        <div className="ceo-insight-block">
          <h3>Top Priority</h3>
          <p>{executiveSummary.topPriority}</p>
        </div>
        <div className="ceo-insight-block ceo-insight-action">
          <h3>Recommended Action</h3>
          <p>{recommendation.action}</p>
          <span className="ceo-insight-impact">{recommendation.expectedImpact}</span>
          <Link href={recommendation.href} className="btn btn-primary btn-sm">
            Ejecutar
          </Link>
        </div>
      </div>

      {criticalRisks.length > 0 && (
        <div className="ceo-insight-list">
          <h3>Critical Risks</h3>
          <ul>
            {criticalRisks.map((r) => (
              <li key={r.id} className={`ceo-risk-${r.severity}`}>
                <strong>{r.ventureName}</strong> — {r.description}
              </li>
            ))}
          </ul>
        </div>
      )}

      {topOpportunities.length > 0 && (
        <div className="ceo-insight-list">
          <h3>Top Opportunities</h3>
          <ul>
            {topOpportunities.map((o) => (
              <li key={o.id}>
                <Link href={o.href}>
                  <strong>{o.ventureName}</strong> — {o.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
