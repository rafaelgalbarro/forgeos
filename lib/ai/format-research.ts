import type { ResearchReport } from "./types/research";

export function formatResearchMercado(report: ResearchReport, source: string): string {
  return `# Análisis de mercado

> Generado por Research Worker (${source})

## Resumen
${report.marketSummary}

## Segmentos objetivo
${report.targetSegments.map((s) => `- ${s}`).join("\n")}

## Riesgos de mercado
${report.marketRisks.map((r) => `- ${r}`).join("\n")}

## Oportunidades
${report.opportunities.map((o) => `- ${o}`).join("\n")}

## Plan de validación
${report.validationPlan.map((v, i) => `${i + 1}. ${v}`).join("\n")}`;
}

export function formatResearchCompetidores(report: ResearchReport, source: string): string {
  return `# Competidores

> Generado por Research Worker (${source})

${report.competitors
  .map(
    (c) => `## ${c.name}
**Tipo:** ${c.type}

**Fortalezas**
${c.strengths.map((s) => `- ${s}`).join("\n")}

**Debilidades**
${c.weaknesses.map((w) => `- ${w}`).join("\n")}`
  )
  .join("\n\n")}

## Ángulos de diferenciación
${report.differentiationAngles.map((d) => `- ${d}`).join("\n")}`;
}

export function formatResearchFounderInsights(report: ResearchReport): string {
  return `## Insights de Research

### Oportunidades detectadas
${report.opportunities.map((o) => `- ${o}`).join("\n")}

### Preguntas recomendadas
${report.recommendedNextQuestions.map((q) => `- ${q}`).join("\n")}`;
}
