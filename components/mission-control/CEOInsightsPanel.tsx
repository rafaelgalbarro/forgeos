"use client";

import { Panel, Stack } from "@/components/ui/fhis/Layout";
import { SectionHeader } from "@/components/ui/fhis/SectionHeader";
import { Badge } from "@/components/ui/fhis/Badge";
import { Progress } from "@/components/ui/fhis/Progress";
import type { CEOInsight, Risk } from "@/lib/pair-founder/types";

interface Props {
  insight: CEOInsight;
  onOpenDecisionCenter?: () => void;
}

const SEVERITY_VARIANT: Record<Risk["severity"], "default" | "amber" | "red" | "accent"> = {
  low: "default",
  medium: "amber",
  high: "red",
  critical: "red",
};

export function CEOInsightsPanel({ insight, onOpenDecisionCenter }: Props) {
  const hasAnalysis = insight.recommendations.length > 0 || insight.contradictions.length > 0;

  return (
    <Panel className="fhis-mc-ceo-insights-panel">
      <Stack gap="md">
        <SectionHeader
          title="CEO Insights"
          subtitle={`Confianza ${insight.confidence}%`}
        />

        <section>
          <strong style={{ fontSize: "0.85rem" }}>Lo que el CEO entiende</strong>
          <p style={{ margin: "6px 0 0", fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)", lineHeight: 1.5 }}>
            {insight.ventureUnderstanding}
          </p>
        </section>

        <section>
          <strong style={{ fontSize: "0.85rem" }}>Qué ha cambiado</strong>
          <p style={{ margin: "6px 0 0", fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>
            {insight.deltaSinceLastTurn}
          </p>
          {insight.exitStrategyDelta && (
            <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "var(--fhis-color-accent, #2563eb)" }}>
              🎯 {insight.exitStrategyDelta.summary}
            </p>
          )}
        </section>

        {insight.hypotheses.length > 0 && (
          <section>
            <strong style={{ fontSize: "0.85rem" }}>Hipótesis</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>
              {insight.hypotheses.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
          </section>
        )}

        {(insight.exitReadiness || insight.strategicAlignment) && (
          <section>
            <strong style={{ fontSize: "0.85rem" }}>Exit Strategy</strong>
            <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
              {insight.exitReadiness && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                    <span>Exit Readiness</span>
                    <span>{insight.exitReadiness.score}/100</span>
                  </div>
                  <Progress value={insight.exitReadiness.score} max={100} />
                </div>
              )}
              {insight.strategicAlignment && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
                    <span>Alineación estratégica</span>
                    <span>{insight.strategicAlignment.score}/100</span>
                  </div>
                  <Progress value={insight.strategicAlignment.score} max={100} />
                </div>
              )}
            </div>
          </section>
        )}

        {insight.contradictions.length > 0 && (
          <section>
            <strong style={{ fontSize: "0.85rem" }}>Contradicciones detectadas</strong>
            <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none" }}>
              {insight.contradictions.map((c) => (
                <li key={c.id} style={{ marginBottom: 8, fontSize: "0.8125rem" }}>
                  <Badge variant={SEVERITY_VARIANT[c.severity]}>{c.severity}</Badge>
                  <span style={{ marginLeft: 6, color: "var(--fhis-color-warning, #c27803)" }}>{c.suggestion}</span>
                  {c.impact && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                      Impacto: {c.impact}
                    </p>
                  )}
                  {c.alternative && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                      Alternativa: {c.alternative}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <strong style={{ fontSize: "0.85rem" }}>Riesgos detectados</strong>
          {insight.risks.length === 0 ? (
            <p style={{ margin: "6px 0 0", fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>
              Sin riesgos críticos en este momento.
            </p>
          ) : (
            <ul style={{ margin: "6px 0 0", paddingLeft: 0, listStyle: "none" }}>
              {insight.risks.map((r) => (
                <li key={r.id} style={{ marginBottom: 8 }}>
                  <Badge variant={SEVERITY_VARIANT[r.severity]}>{r.severity}</Badge>
                  <span style={{ fontSize: "0.8125rem", marginLeft: 6 }}>{r.title}</span>
                  {r.mitigation && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                      → {r.mitigation}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        {insight.priorities.length > 0 && (
          <section>
            <strong style={{ fontSize: "0.85rem" }}>Prioridades</strong>
            <ol style={{ margin: "6px 0 0", paddingLeft: 16, fontSize: "0.8125rem" }}>
              {insight.priorities.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ol>
          </section>
        )}

        <section>
          <strong style={{ fontSize: "0.85rem" }}>Próxima recomendación</strong>
          <p style={{ margin: "6px 0 0", fontSize: "0.875rem", fontWeight: 500 }}>
            {insight.nextRecommendation.action}
          </p>
          <p style={{ margin: "4px 0 0", fontSize: "0.8125rem", color: "var(--fhis-color-text-muted)" }}>
            {insight.nextRecommendation.justification}
          </p>
          {insight.nextRecommendation.alternatives && insight.nextRecommendation.alternatives.length > 0 && (
            <div style={{ marginTop: 8 }}>
              <span style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>Alternativas:</span>
              <ul style={{ margin: "4px 0 0", paddingLeft: 16, fontSize: "0.75rem" }}>
                {insight.nextRecommendation.alternatives.map((a) => (
                  <li key={a.id}>{a.title} — {a.justification}</li>
                ))}
              </ul>
            </div>
          )}
        </section>

        {insight.recommendations.length > 0 && (
          <section>
            <strong style={{ fontSize: "0.85rem" }}>Recomendaciones estructuradas</strong>
            {insight.recommendations.map((rec, i) => (
              <div key={i} style={{ marginTop: 8, padding: "8px 10px", borderRadius: 6, background: "var(--fhis-color-surface-muted, #f8f9fa)" }}>
                <p style={{ margin: 0, fontSize: "0.8125rem", fontWeight: 500 }}>{rec.recommendation}</p>
                <p style={{ margin: "4px 0 0", fontSize: "0.75rem", color: "var(--fhis-color-text-muted)" }}>
                  {rec.rationaleSummary}
                </p>
                <div style={{ display: "flex", gap: 8, marginTop: 4, fontSize: "0.7rem", color: "var(--fhis-color-text-muted)" }}>
                  <span>Confianza: {rec.confidence}%</span>
                  <span>Riesgo: {rec.risk}</span>
                </div>
              </div>
            ))}
          </section>
        )}

        {insight.pendingDecisionCount > 0 && (
          <section>
            <strong style={{ fontSize: "0.85rem" }}>Decisiones pendientes</strong>
            <p style={{ margin: "6px 0 0", fontSize: "0.8125rem" }}>
              {insight.pendingDecisionCount} decisión(es) en el{" "}
              {onOpenDecisionCenter ? (
                <button
                  type="button"
                  onClick={onOpenDecisionCenter}
                  style={{ background: "none", border: "none", padding: 0, color: "var(--fhis-color-accent, #2563eb)", cursor: "pointer", textDecoration: "underline", fontSize: "inherit" }}
                >
                  Decision Center
                </button>
              ) : (
                "Decision Center"
              )}
              .
            </p>
          </section>
        )}

        {!hasAnalysis && (
          <p style={{ fontSize: "0.75rem", color: "var(--fhis-color-text-muted)", fontStyle: "italic" }}>
            Envía un mensaje o escribe &quot;revisar&quot; para activar el análisis del co-founder.
          </p>
        )}
      </Stack>
    </Panel>
  );
}
