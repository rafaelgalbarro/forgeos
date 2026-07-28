import type { VentureProject } from "@/lib/domain/venture";
import {
  exportProductRoadmapMarkdown,
  exportSimulatorReportMarkdown,
} from "./markdown-exporter";
import {
  exportHeader,
  getSectionContent,
  listOrPending,
  PENDING,
  valueOrPending,
} from "./export-utils";

function extractSectionBody(content: string): string {
  if (content === PENDING) return PENDING;
  return content.replace(/^#\s+.+\n+/m, "").trim();
}

export function exportInvestorPackMarkdown(venture: VentureProject): string {
  const intel = venture.intelligenceReport;
  const prd = venture.productPRD;
  const research = venture.researchReport;
  const sim = venture.ventureSimulatorResult;

  const resumen =
    prd?.executiveSummary ??
    extractSectionBody(getSectionContent(venture, "resumen")) ??
    venture.ideaText;

  const problema = prd?.problemStatement ?? intel?.founderAdvisor.summary ?? PENDING;
  const solucion = prd?.valueProposition ?? prd?.executiveSummary ?? PENDING;
  const cliente = prd?.targetCustomer ?? venture.targetAudience;
  const modelo = intel?.recommendedBusinessModel ?? venture.analysis?.market.modeloNegocio ?? PENDING;

  const mercado = research
    ? research.marketSummary
    : extractSectionBody(getSectionContent(venture, "mercado"));

  const competidores = research
    ? research.competitors.map((c) => `**${c.name}** (${c.type})`).join("\n")
    : extractSectionBody(getSectionContent(venture, "competidores"));

  const diferenciacion = research
    ? listOrPending(research.differentiationAngles)
    : intel?.competition.differentiationAngle ?? PENDING;

  const pricing = getSectionContent(venture, "pricing");
  const kpis = getSectionContent(venture, "kpis");
  const roadmap = prd
    ? `### 30 días\n${listOrPending(prd.roadmap30_60_90.day30)}\n\n### 60 días\n${listOrPending(prd.roadmap30_60_90.day60)}\n\n### 90 días\n${listOrPending(prd.roadmap30_60_90.day90)}`
    : extractSectionBody(getSectionContent(venture, "roadmap"));

  const riesgos = sim?.risks.length
    ? listOrPending(sim.risks)
    : listOrPending(intel?.risks.map((r) => `${r.title}: ${r.description}`));

  const oportunidades = sim?.opportunities.length
    ? listOrPending(sim.opportunities)
    : listOrPending(intel?.opportunities.map((o) => `${o.title}: ${o.description}`));

  const ventureScoreBlock = sim
    ? `**Venture Score:** ${sim.ventureScore}/100  
**Startup Score:** ${sim.startupScore}/100  
**Recomendación:** ${sim.recommendationLabel}  
**Confianza:** ${sim.confidence}`
    : intel
      ? `**Startup Score:** ${intel.startupScore}/100 (Venture Simulator: ${PENDING})`
      : PENDING;

  const escenarios = sim?.scenarios
    .map(
      (s) =>
        `#### ${s.scenario.charAt(0).toUpperCase() + s.scenario.slice(1)}
- Usuarios A1/A2: ${s.year1Users.toLocaleString("es-ES")} / ${s.year2Users.toLocaleString("es-ES")}
- Ingresos A1/A2: €${s.year1Revenue.toLocaleString("es-ES")} / €${s.year2Revenue.toLocaleString("es-ES")}
- CAC: €${s.estimatedCAC} · LTV: €${s.estimatedLTV} · Break-even: ${s.breakEvenMonths ?? "N/A"} meses`
    )
    .join("\n\n") ?? PENDING;

  const proximosPasos =
    sim?.suggestedNextAction ??
    intel?.founderAdvisor.recommendations.map((r) => r.text).join("\n") ??
    PENDING;

  return `${exportHeader(`Investor Pack — ${venture.name}`, venture)}
> Documento consolidado para inversores y stakeholders. Datos heurísticos marcados como estimaciones.

## 1. Resumen ejecutivo

${valueOrPending(resumen)}

## 2. Problema

${valueOrPending(problema)}

## 3. Solución

${valueOrPending(solucion)}

## 4. Cliente objetivo

${valueOrPending(cliente)}

## 5. Mercado

${valueOrPending(mercado)}

## 6. Competidores

${valueOrPending(competidores)}

## 7. Diferenciación

${valueOrPending(typeof diferenciacion === "string" ? diferenciacion : String(diferenciacion))}

## 8. Modelo de negocio

${valueOrPending(modelo)}

## 9. Pricing

${pricing}

## 10. Venture Score

${ventureScoreBlock}

## 11. Escenarios (conservador / base / optimista)

${escenarios}

## 12. Riesgos

${riesgos}

## 13. Oportunidades

${oportunidades}

## 14. Roadmap

${roadmap}

## 15. KPIs

${kpis}

## 16. Próximos pasos

${valueOrPending(typeof proximosPasos === "string" ? proximosPasos : String(proximosPasos))}

---
## Anexos

Los siguientes documentos completos están disponibles como exportaciones individuales en ForgeOS.

- PRD
- Research Report
- Venture Simulator Report
- Product Roadmap

---
*ForgeOS Investor Pack v0.1 — Markdown. Exportación PDF planificada.*
`;
}

/** Full annex helpers for programmatic use */
export function exportInvestorPackAnnexes(venture: VentureProject): {
  simulator: string;
  roadmap: string;
} {
  return {
    simulator: exportSimulatorReportMarkdown(venture),
    roadmap: exportProductRoadmapMarkdown(venture),
  };
}
