import type { VentureProject } from "@/lib/domain/venture";
import {
  exportHeader,
  getSectionContent,
  listOrPending,
  PENDING,
  valueOrPending,
} from "./export-utils";

export function exportProjectBriefMarkdown(venture: VentureProject): string {
  const intel = venture.intelligenceReport;
  const prd = venture.productPRD;
  const advisor = venture.founderAdvisor;

  const problema =
    prd?.problemStatement ??
    (intel?.founderAdvisor.summary ? intel.founderAdvisor.summary.slice(0, 400) : null) ??
    venture.ideaText;

  const solucion =
    prd?.valueProposition ??
    prd?.executiveSummary ??
    intel?.founderAdvisor.recommendations[0]?.text;

  const resumen =
    getSectionContent(venture, "resumen") !== PENDING
      ? getSectionContent(venture, "resumen")
      : prd?.executiveSummary ?? intel?.founderAdvisor.headline ?? venture.ideaText;

  const proximosPasos =
    venture.ventureSimulatorResult?.suggestedNextAction ??
    intel?.founderAdvisor.recommendations.map((r) => r.text).join("; ") ??
    PENDING;

  return `${exportHeader(`Project Brief — ${venture.name}`, venture)}
## Resumen ejecutivo

${resumen}

## Problema

${valueOrPending(problema)}

## Solución

${valueOrPending(solucion)}

## Cliente objetivo

${valueOrPending(prd?.targetCustomer ?? venture.targetAudience)}

## Modelo de negocio

${valueOrPending(intel?.recommendedBusinessModel ?? venture.analysis?.market.modeloNegocio)}

## Mercado (snapshot)

${valueOrPending(intel?.market.tamEstimate ?? venture.analysis?.market.mercadoEstimado)}

## Startup Score

${intel ? `${intel.startupScore}/100 — ${intel.launchPriority} prioridad` : PENDING}

## Founder Advisor

${advisor?.recommendation ?? intel?.founderAdvisor.headline ?? PENDING}

### Riesgos clave

${listOrPending(
  intel?.risks.map((r) => `${r.title}: ${r.description}`) ?? [],
  5
)}

## Próximos pasos

${valueOrPending(proximosPasos)}

---
*Documento generado por ForgeOS. Formato Markdown — exportación PDF planificada.*
`;
}
