import { formatProductPRDAsMarkdown, formatRoadmapFromPRD } from "@/lib/ai/format-product-prd";
import {
  formatResearchCompetidores,
  formatResearchMercado,
} from "@/lib/ai/format-research";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import type { VentureProject } from "@/lib/domain/venture";
import {
  exportHeader,
  formatCurrency,
  getSectionContent,
  listOrPending,
  PENDING,
  valueOrPending,
} from "./export-utils";

const SCENARIO_LABELS = {
  conservador: "Conservador",
  base: "Base",
  optimista: "Optimista",
} as const;

function resolveSimulatorResult(venture: VentureProject) {
  if (venture.ventureSimulatorResult) return venture.ventureSimulatorResult;
  return runVentureSimulator(ventureToSimulatorInput(venture));
}

export function exportPRDMarkdown(venture: VentureProject): string {
  const header = exportHeader(`PRD — ${venture.name}`, venture);

  if (venture.productPRD) {
    const source = venture.productPRDSource ?? "mock";
    return header + formatProductPRDAsMarkdown(venture.productPRD, venture.name, source);
  }

  const section = getSectionContent(venture, "prd");
  if (section !== PENDING) return header + section;
  return header + PENDING;
}

export function exportResearchMarkdown(venture: VentureProject): string {
  const header = exportHeader(`Research Report — ${venture.name}`, venture);
  const source = venture.researchMeta?.source ?? "mock";

  if (venture.researchReport) {
    const mercado = formatResearchMercado(venture.researchReport, source);
    const competidores = formatResearchCompetidores(venture.researchReport, source);
    return `${header}${mercado}\n\n---\n\n${competidores}`;
  }

  const mercadoSection = getSectionContent(venture, "mercado");
  const competidoresSection = getSectionContent(venture, "competidores");

  if (mercadoSection === PENDING && competidoresSection === PENDING) {
    return header + PENDING;
  }

  return `${header}## Mercado\n\n${mercadoSection}\n\n---\n\n## Competidores\n\n${competidoresSection}`;
}

export function exportProductRoadmapMarkdown(venture: VentureProject): string {
  const header = exportHeader(`Product Roadmap — ${venture.name}`, venture);

  if (venture.productPRD) {
    return header + formatRoadmapFromPRD(venture.productPRD);
  }

  const roadmapSection = getSectionContent(venture, "roadmap");
  if (roadmapSection !== PENDING) return header + roadmapSection;
  return header + PENDING;
}

export function exportSimulatorReportMarkdown(venture: VentureProject): string {
  const header = exportHeader(`Venture Simulator Report — ${venture.name}`, venture);
  const result = resolveSimulatorResult(venture);

  if (!result) {
    return `${header}${PENDING}`;
  }

  const scenariosBlock = result.scenarios
    .map((s) => {
      const label = SCENARIO_LABELS[s.scenario];
      return `### Escenario ${label}

| Métrica | Valor |
|---------|-------|
| Usuarios año 1 | ${s.year1Users.toLocaleString("es-ES")} |
| Usuarios año 2 | ${s.year2Users.toLocaleString("es-ES")} |
| Ingresos año 1 | ${formatCurrency(s.year1Revenue)} |
| Ingresos año 2 | ${formatCurrency(s.year2Revenue)} |
| CAC | ${formatCurrency(s.estimatedCAC)} |
| LTV | ${formatCurrency(s.estimatedLTV)} |
| Conversión | ${s.estimatedConversion}% |
| Churn mensual | ${s.estimatedChurn}% |
| Break-even | ${s.breakEvenMonths ? `${s.breakEvenMonths} meses` : "No alcanzado"} |
| Complejidad adquisición | ${s.acquisitionComplexity} |

**Riesgo principal:** ${s.primaryRisk}`;
    })
    .join("\n\n");

  const customNote = result.customAssumptions
    ? "\n> ⚠ Supuestos personalizados por el usuario (custom assumptions)\n"
    : "";

  return `${header}${customNote}
## Scores y recomendación

| Métrica | Valor |
|---------|-------|
| Startup Score | ${result.startupScore}/100 |
| Venture Score | ${result.ventureScore}/100 |
| Recomendación | ${result.recommendationLabel} |
| Confianza | ${result.confidence} |

## Escenarios económicos

${scenariosBlock}

## Riesgos

${listOrPending(result.risks)}

## Oportunidades

${listOrPending(result.opportunities)}

## Alternativas recomendadas

${listOrPending(result.recommendedAlternatives)}

## Siguiente acción sugerida

${valueOrPending(result.suggestedNextAction)}

## Modelo de negocio (supuestos)

- **Modelo:** ${result.assumptions.businessModel}
- **Usuarios base año 1:** ${result.assumptions.baseYear1Users.toLocaleString("es-ES")}
- **CAC base:** ${formatCurrency(result.assumptions.baseCAC)}
- **Burn mensual estimado:** ${formatCurrency(result.assumptions.monthlyBurnEstimate)}

---
*Simulación heurística — no sustituye validación con usuarios reales ni modelos financieros formales.*
`;
}
