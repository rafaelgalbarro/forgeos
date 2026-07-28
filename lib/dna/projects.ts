import type { VentureProject } from "@/lib/domain/venture";
import type { ProductPRDResponse } from "@/lib/ai/types/product";
import type { ResearchReportResponse } from "@/lib/ai/types/research";
import { createArchitectureRecord } from "./architectures";
import { createDecision } from "./decisions";
import { createLesson } from "./lessons";
import { createPromptRecord } from "./prompts";
import type { ForgeProjectDNA } from "./types";

export interface BuildProjectDNAInput {
  venture: VentureProject;
  workersExecuted: string[];
  productPRD?: ProductPRDResponse | null;
  researchReport?: ResearchReportResponse | null;
}

export function buildProjectDNA(input: BuildProjectDNAInput): ForgeProjectDNA {
  const { venture, workersExecuted, productPRD, researchReport } = input;
  const now = new Date().toISOString();
  const ventureId = venture.id;

  const decisions = [
    createDecision(
      ventureId,
      "founder",
      "Modelo de negocio recomendado",
      venture.intelligenceReport?.recommendedBusinessModel ?? "Por definir"
    ),
    createDecision(
      ventureId,
      "cto",
      "Complejidad técnica",
      venture.intelligenceReport?.technicalComplexity ?? "Media"
    ),
  ];

  const architecture = createArchitectureRecord(
    ventureId,
    ["Next.js", "TypeScript", "API Routes"],
    venture.intelligenceReport?.technicalComplexity
      ? `Arquitectura preparada para ${venture.intelligenceReport.technicalComplexity} complejidad.`
      : "Arquitectura base SaaS web."
  );

  const prompts = [
    ...(productPRD
      ? [
          createPromptRecord(
            ventureId,
            "product",
            "product-prd-v1",
            `Generar PRD para: ${venture.ideaText.slice(0, 200)}`
          ),
        ]
      : []),
    ...(researchReport
      ? [
          createPromptRecord(
            ventureId,
            "research",
            "research-v1",
            `Research de mercado para: ${venture.ideaText.slice(0, 200)}`
          ),
        ]
      : []),
  ];

  const lessons = [
    createLesson(
      ventureId,
      "Validación previa",
      venture.intelligenceReport?.founderAdvisor.summary ?? venture.ideaText,
      "heuristic"
    ),
  ];

  return {
    ventureId,
    projectName: venture.name,
    ideaText: venture.ideaText,
    decisions,
    architecture,
    prompts,
    workersExecuted,
    results: {
      startupScore: venture.intelligenceReport?.startupScore ?? null,
      productPRDSource: productPRD?.source ?? "mock",
      productUsedResearch: productPRD?.usedResearch ?? null,
      productFallbackUsed: productPRD?.fallbackUsed ?? null,
      researchSource: researchReport?.source ?? null,
      researchFallbackUsed: researchReport?.fallbackUsed ?? null,
      sectionCount: venture.sections?.length ?? 0,
    },
    lessons,
    createdAt: now,
    updatedAt: now,
  };
}
