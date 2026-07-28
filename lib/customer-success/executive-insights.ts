import type { ExecutiveInsight } from "./types";
import { getLatestExecutiveReport } from "./executive-reports";
import { getNpsScore } from "./nps-engine";
import { getRetentionMetrics } from "./retention";
import { getActivationMetrics } from "./activation";
import { getExpansionMetrics } from "./expansion";
import { getAiUsageSummary } from "./ai-usage-analytics";
import { getSupportMetrics } from "./support-metrics";
import { computeSuccessScore } from "./success-score";
import { computeCustomerHealth } from "./customer-health";

export function generateExecutiveInsights(): ExecutiveInsight[] {
  const nps = getNpsScore();
  const retention = getRetentionMetrics();
  const activation = getActivationMetrics();
  const expansion = getExpansionMetrics();
  const ai = getAiUsageSummary();
  const support = getSupportMetrics();
  const health = computeCustomerHealth();
  const successScore = computeSuccessScore(health);
  const report = getLatestExecutiveReport();

  const insights: ExecutiveInsight[] = [
    {
      id: "insight-success-score",
      category: "growth",
      title: "Puntuación de éxito compuesta",
      summary: `La puntuación global de customer success es ${successScore}/100 (salud: ${health.tier}).`,
      priority: successScore < 50 ? "high" : successScore < 75 ? "medium" : "low",
      metric: `${successScore}/100`,
      recommendation:
        successScore < 60
          ? "Priorizar activación y feedback de design partners en las próximas 2 semanas."
          : "Mantener ritmo de engagement y ampliar cohorte de partners.",
    },
    {
      id: "insight-nps",
      category: "retention",
      title: "Net Promoter Score",
      summary: `NPS actual: ${nps.score} con ${nps.responses} respuestas (${nps.promoters} promotores, ${nps.detractors} detractores).`,
      priority: nps.score < 0 ? "high" : nps.score < 30 ? "medium" : "low",
      metric: `NPS ${nps.score}`,
      recommendation:
        nps.responses < 5
          ? "Lanzar campaña NPS a design partners activos para obtener señal estadística."
          : "Analizar comentarios de detractores y cerrar loop con founders.",
    },
    {
      id: "insight-activation",
      category: "product",
      title: "Activación de producto",
      summary: `Tasa de activación ${activation.rate}% (${activation.completed}/${activation.started} completaron venture).`,
      priority: activation.rate < 40 ? "high" : "medium",
      metric: `${activation.rate}%`,
      recommendation: "Revisar fricción en onboarding post-registro y tiempo hasta primer venture.",
    },
    {
      id: "insight-retention",
      category: "retention",
      title: "Retención de cohorte",
      summary: `Retención ${retention.rate}% — ${retention.returningUsers} de ${retention.cohortSize} usuarios recurrentes.`,
      priority: retention.rate < 50 ? "high" : "low",
      metric: `${retention.rate}%`,
      recommendation: "Identificar partners que no llegan a analytics y activar outreach personalizado.",
    },
    {
      id: "insight-expansion",
      category: "growth",
      title: "Señales de expansión",
      summary: `Expansión ${expansion.rate}% con ${expansion.upsellSignals} ideas de alta prioridad.`,
      priority: expansion.upsellSignals > 3 ? "medium" : "low",
      metric: `${expansion.rate}%`,
      recommendation: "Mapear feature requests de alta prioridad al roadmap comercial Q+1.",
    },
    {
      id: "insight-ai",
      category: "ai",
      title: "Uso de IA",
      summary: `${ai.requestCount} solicitudes AI, coste estimado $${ai.totalCostUsd.toFixed(2)}, latencia media ${ai.avgLatencyMs}ms.`,
      priority: ai.errors > 5 ? "high" : "low",
      metric: `$${ai.totalCostUsd.toFixed(2)}`,
      recommendation: "Monitorizar coste por partner y optimizar tareas con mayor consumo de tokens.",
    },
    {
      id: "insight-support",
      category: "support",
      title: "Soporte y satisfacción",
      summary: `${support.openTickets} tickets abiertos, ${support.resolvedTickets} resueltos, CSAT ${support.satisfactionScore}/10.`,
      priority: support.openTickets > 5 ? "high" : "medium",
      metric: `CSAT ${support.satisfactionScore}`,
      recommendation: "Reducir tiempo medio de resolución por debajo de 24h para partners críticos.",
    },
  ];

  if (report) {
    insights.unshift({
      id: "insight-latest-report",
      category: "growth",
      title: report.title,
      summary: report.summary,
      priority: "medium",
      recommendation: report.highlights[0] ?? "Revisar informe ejecutivo completo.",
    });
  }

  return insights;
}
