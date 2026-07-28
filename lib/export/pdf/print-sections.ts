import type { VentureProject } from "@/lib/domain/venture";
import { PENDING, getSectionContent, valueOrPending } from "../export-utils";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import { formatCurrency } from "../export-utils";

export interface PrintSection {
  id: string;
  number: number;
  title: string;
  body: string;
  isPending?: boolean;
}

export interface VenturePrintData {
  ventureName: string;
  ventureId: string;
  generatedAt: string;
  category: string;
  targetAudience: string;
  ventureScore: string;
  recommendation: string;
  confidence: string;
  sections: PrintSection[];
  toc: { number: number; title: string; id: string }[];
}

function pending(text: string | null | undefined): string {
  if (!text?.trim() || text.trim() === PENDING.replace(/\*/g, "")) return PENDING;
  return text.trim();
}

export function buildVenturePrintData(venture: VentureProject): VenturePrintData {
  const intel = venture.intelligenceReport;
  const prd = venture.productPRD;
  const research = venture.researchReport;
  const sim =
    venture.ventureSimulatorResult ?? runVentureSimulator(ventureToSimulatorInput(venture));

  const resumenSection = getSectionContent(venture, "resumen");
  const resumen = pending(
    prd?.executiveSummary ??
      (resumenSection !== PENDING ? resumenSection.replace(/^#.*\n+/m, "") : undefined) ??
      venture.ideaText
  );

  const scoreBlock = sim
    ? `Venture Score: ${sim.ventureScore}/100\nStartup Score: ${sim.startupScore}/100\nRecomendación: ${sim.recommendationLabel}\nConfianza: ${sim.confidence}`
    : intel
      ? `Startup Score: ${intel.startupScore}/100\n${PENDING}`
      : PENDING;

  const escenarios = sim?.scenarios.length
    ? sim.scenarios
        .map(
          (s) =>
            `${s.scenario.toUpperCase()}\n` +
            `  Usuarios A1/A2: ${s.year1Users.toLocaleString("es-ES")} / ${s.year2Users.toLocaleString("es-ES")}\n` +
            `  Ingresos A1/A2: ${formatCurrency(s.year1Revenue)} / ${formatCurrency(s.year2Revenue)}\n` +
            `  CAC: ${formatCurrency(s.estimatedCAC)} · LTV: ${formatCurrency(s.estimatedLTV)}\n` +
            `  Conversión: ${s.estimatedConversion}% · Churn: ${s.estimatedChurn}%\n` +
            `  Break-even: ${s.breakEvenMonths ? `${s.breakEvenMonths} meses` : "No alcanzado"}\n` +
            `  Riesgo: ${s.primaryRisk}`
        )
        .join("\n\n")
    : PENDING;

  const researchBody = research
    ? `RESUMEN DE MERCADO\n${research.marketSummary}\n\nSEGMENTOS\n${research.targetSegments.map((s) => `• ${s}`).join("\n")}\n\nCOMPETIDORES\n${research.competitors.map((c) => `• ${c.name} (${c.type})`).join("\n")}\n\nOPORTUNIDADES\n${research.opportunities.map((o) => `• ${o}`).join("\n")}\n\nDIFERENCIACIÓN\n${research.differentiationAngles.map((d) => `• ${d}`).join("\n")}`
    : pending(getSectionContent(venture, "mercado")) +
      "\n\n" +
      pending(getSectionContent(venture, "competidores"));

  const prdBody = prd
    ? `PROBLEMA\n${prd.problemStatement}\n\nSOLUCIÓN / PROPUESTA DE VALOR\n${prd.valueProposition}\n\nCLIENTE\n${prd.targetCustomer}\n\nMVP SCOPE\n${prd.mvpScope.map((m) => `• ${m}`).join("\n")}\n\nUSER STORIES\n${prd.userStories.slice(0, 8).map((u) => `• ${u}`).join("\n")}`
    : pending(getSectionContent(venture, "prd"));

  const roadmapBody = prd
    ? `30 DÍAS\n${prd.roadmap30_60_90.day30.map((i) => `• ${i}`).join("\n")}\n\n60 DÍAS\n${prd.roadmap30_60_90.day60.map((i) => `• ${i}`).join("\n")}\n\n90 DÍAS\n${prd.roadmap30_60_90.day90.map((i) => `• ${i}`).join("\n")}`
    : pending(getSectionContent(venture, "roadmap"));

  const kpisBody = pending(getSectionContent(venture, "kpis"));
  const proximosPasos = pending(
    sim?.suggestedNextAction ??
      intel?.founderAdvisor.recommendations.map((r) => r.text).join("\n")
  );

  const rawSections: Omit<PrintSection, "number">[] = [
    { id: "resumen", title: "Resumen ejecutivo", body: resumen, isPending: resumen === PENDING },
    { id: "scores", title: "Venture Score y recomendación", body: scoreBlock, isPending: scoreBlock.includes(PENDING) },
    { id: "escenarios", title: "Escenarios económicos", body: escenarios, isPending: escenarios === PENDING },
    { id: "research", title: "Research", body: researchBody, isPending: researchBody.includes(PENDING) },
    { id: "prd", title: "PRD", body: prdBody, isPending: prdBody === PENDING },
    { id: "roadmap", title: "Roadmap", body: roadmapBody, isPending: roadmapBody === PENDING },
    { id: "kpis", title: "KPIs", body: kpisBody, isPending: kpisBody === PENDING },
    { id: "next-steps", title: "Próximos pasos", body: proximosPasos, isPending: proximosPasos === PENDING },
  ];

  const sections: PrintSection[] = rawSections.map((s, i) => ({
    ...s,
    number: i + 1,
  }));

  return {
    ventureName: venture.name,
    ventureId: venture.id,
    generatedAt: new Date().toISOString(),
    category: venture.category,
    targetAudience: venture.targetAudience,
    ventureScore: sim ? `${sim.ventureScore}/100` : intel ? `${intel.startupScore}/100` : PENDING,
    recommendation: sim?.recommendationLabel ?? PENDING,
    confidence: sim?.confidence ?? PENDING,
    sections,
    toc: sections.map((s) => ({ number: s.number, title: s.title, id: s.id })),
  };
}
