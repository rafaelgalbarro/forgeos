import type { VentureProject } from "@/lib/domain/venture";
import { formatDiscoveryContextForPrompt } from "@/lib/discovery/discovery-context";
import { getBrainContextForWorker } from "@/lib/brain";
import {
  runVentureSimulator,
  ventureToSimulatorInput,
} from "@/lib/venture-simulator";
import { PENDING } from "./types";

export interface PromptContext {
  ventureName: string;
  ideaText: string;
  prdBlock: string;
  researchBlock: string;
  discoveryBlock: string;
  simulatorBlock: string;
  brainBlock: string;
  mvpScope: string;
  screens: string;
  coreFlows: string;
  stackSummary: string;
  implementationOrder: string;
}

function list(items: string[] | undefined, fallback = PENDING): string {
  if (!items?.length) return fallback;
  return items.map((i) => `- ${i}`).join("\n");
}

export function buildPromptContext(
  venture: VentureProject,
  stackSummary: string,
  implementationOrder: string[]
): PromptContext {
  const prd = venture.productPRD;
  const research = venture.researchReport;
  const sim =
    venture.ventureSimulatorResult ?? runVentureSimulator(ventureToSimulatorInput(venture));

  const prdBlock = prd
    ? `## PRD
Resumen: ${prd.executiveSummary}
Problema: ${prd.problemStatement}
Propuesta de valor: ${prd.valueProposition}
Cliente: ${prd.targetCustomer}
MVP Scope:
${list(prd.mvpScope)}
User Stories:
${list(prd.userStories?.slice(0, 8))}
Assumptions:
${list(prd.assumptions?.slice(0, 6))}
Riesgos producto:
${list(prd.risks?.slice(0, 5))}`
    : `## PRD\n${PENDING}`;

  const researchBlock = research
    ? `## Research
Mercado: ${research.marketSummary}
Segmentos: ${research.targetSegments.join(", ") || PENDING}
Competidores: ${research.competitors.map((c) => c.name).join(", ") || PENDING}
Diferenciación:
${list(research.differentiationAngles)}
Oportunidades:
${list(research.opportunities?.slice(0, 5))}`
    : `## Research\n${PENDING}`;

  const discoveryBlock = formatDiscoveryContextForPrompt(venture.discoveryContext ?? null);

  const simulatorBlock = sim
    ? `## Venture Simulator
Venture Score: ${sim.ventureScore}/100
Recomendación: ${sim.recommendationLabel}
Confianza: ${sim.confidence}
Siguiente acción: ${sim.suggestedNextAction}
Escenario base — usuarios A1: ${sim.scenarios.find((s) => s.scenario === "base")?.year1Users ?? PENDING}`
    : `## Venture Simulator\n${PENDING}`;

  const brainBlock = getBrainContextForWorker("product");

  return {
    ventureName: venture.name,
    ideaText: venture.ideaText,
    prdBlock,
    researchBlock,
    discoveryBlock,
    simulatorBlock,
    brainBlock,
    mvpScope: list(prd?.mvpScope),
    screens: list(prd?.mainScreens),
    coreFlows: list(prd?.coreFlows),
    stackSummary,
    implementationOrder: implementationOrder.map((s, i) => `${i + 1}. ${s}`).join("\n"),
  };
}
