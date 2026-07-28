"use client";

import type { IntelligencePreview } from "@/lib/intelligence/types";
import type { DetectedTag } from "@/lib/intelligence/types";

interface AnalysisPanelProps {
  preview: IntelligencePreview | null;
}

const CATEGORY_COLORS: Record<string, string> = {
  product: "chip-product",
  business: "chip-business",
  tech: "chip-tech",
  model: "chip-model",
};

export function AnalysisPanel({ preview }: AnalysisPanelProps) {
  if (!preview) {
    return (
      <aside className="analysis-panel analysis-panel-empty">
        <p className="analysis-hint">Empieza a escribir. Forge Intelligence analizará tu idea en tiempo real.</p>
      </aside>
    );
  }

  const scoreClass =
    preview.startupScore >= 65 ? "score-high" : preview.startupScore >= 45 ? "score-mid" : "score-low";

  return (
    <aside className="analysis-panel">
      <div className="analysis-section">
        <h3 className="analysis-label">Startup Score</h3>
        <div className="analysis-score-row">
          <span className={`analysis-score-badge ${scoreClass}`}>{preview.startupScore}</span>
          <span className="analysis-score-label">{preview.scoreLabel}</span>
        </div>
      </div>

      <div className="analysis-section">
        <h3 className="analysis-label">Detectado</h3>
        <div className="chip-row">
          {preview.tags.map((tag: DetectedTag) => (
            <span key={tag.id} className={`chip ${CATEGORY_COLORS[tag.category]}`}>
              {tag.label}
            </span>
          ))}
        </div>
      </div>

      <div className="analysis-section">
        <h3 className="analysis-label">Forge Intelligence</h3>
        <div className="metrics-grid">
          <Metric label="Mercado" value={preview.mercado} />
          <Metric label="Competencia" value={preview.competencia} />
          <Metric label="Escalabilidad" value={preview.escalabilidad} />
          <Metric label="Monetización" value={preview.monetizacion} />
          <Metric label="Tiempo MVP" value={preview.tiempoMvp} />
          <Metric label="Complejidad" value={preview.complejidadTecnica} />
          <Metric label="Éxito est." value={preview.probabilidadExito} highlight />
        </div>
      </div>
    </aside>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`metric-cell ${highlight ? "metric-highlight" : ""}`}>
      <span className="metric-label">{label}</span>
      <span className="metric-value">{value}</span>
    </div>
  );
}
