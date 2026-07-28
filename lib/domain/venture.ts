import type { FounderAdvisorReport } from "@/lib/domain/founder-advisor";
import { mapFounderAdvisorReport } from "@/lib/domain/founder-advisor";
import type { IdeaAnalysis } from "@/lib/domain/idea";
import type { ForgeIntelligenceReport } from "@/lib/intelligence/types";
import type { DiscoveryAnswerMap, DiscoveryContext } from "@/lib/discovery/types";
import type { VentureSimulatorOverrides, VentureSimulatorResult } from "@/lib/venture-simulator";
import type { ProductPRD } from "@/lib/ai/types/product";
import type { ResearchReport, ResearchReportResponse } from "@/lib/ai/types/research";
import type { AppCategory } from "@/lib/types/app";

export type VentureSectionId =
  | "resumen"
  | "memoria"
  | "decisiones"
  | "simulator"
  | "build-plan"
  | "founder-advisor"
  | "mercado"
  | "competidores"
  | "prd"
  | "mvp"
  | "wireframes"
  | "ux"
  | "arquitectura"
  | "base-datos"
  | "backend"
  | "frontend"
  | "landing"
  | "pricing"
  | "kpis"
  | "roadmap"
  | "legal"
  | "qa";

export type VentureStatus = "intelligence" | "building" | "ready";

export interface VentureSection {
  id: VentureSectionId;
  title: string;
  content: string;
  format: "markdown" | "code";
}

export interface VentureProject {
  id: string;
  ideaText: string;
  name: string;
  description: string;
  category: AppCategory;
  targetAudience: string;
  status: VentureStatus;
  createdAt: string;
  updatedAt: string;
  intelligenceReport: ForgeIntelligenceReport | null;
  analysis: IdeaAnalysis | null;
  founderAdvisor: FounderAdvisorReport | null;
  intelligenceAccepted?: boolean;
  productPRD?: ProductPRD | null;
  productPRDSource?: "ai" | "mock";
  productMeta?: {
    source: "ai" | "mock";
    provider?: string;
    usedResearch: boolean;
    usedKnowledgeRefs: { id: string; domain: string; title: string }[];
    fallbackUsed: boolean;
  } | null;
  researchReport?: ResearchReport | null;
  researchMeta?: Pick<ResearchReportResponse, "source" | "provider" | "usedKnowledgeRefs" | "fallbackUsed"> | null;
  discoveryAnswers?: DiscoveryAnswerMap | null;
  discoveryContext?: DiscoveryContext | null;
  ventureSimulatorResult?: VentureSimulatorResult | null;
  ventureSimulatorOverrides?: VentureSimulatorOverrides | null;
  sections: VentureSection[];
}

export const VENTURE_NAV: { id: VentureSectionId; title: string; group?: string }[] = [
  { id: "resumen", title: "Resumen Ejecutivo", group: "Overview" },
  { id: "memoria", title: "Memoria", group: "Overview" },
  { id: "decisiones", title: "Decisiones aclaradas", group: "Overview" },
  { id: "simulator", title: "Venture Simulator", group: "Overview" },
  { id: "build-plan", title: "Build Plan", group: "Engineering" },
  { id: "founder-advisor", title: "Founder Advisor", group: "Overview" },
  { id: "mercado", title: "Mercado", group: "Research" },
  { id: "competidores", title: "Competidores", group: "Research" },
  { id: "prd", title: "PRD", group: "Product" },
  { id: "mvp", title: "MVP", group: "Product" },
  { id: "wireframes", title: "Wireframes", group: "Product" },
  { id: "ux", title: "UX", group: "Product" },
  { id: "arquitectura", title: "Arquitectura", group: "Engineering" },
  { id: "base-datos", title: "Base de datos", group: "Engineering" },
  { id: "backend", title: "Backend", group: "Engineering" },
  { id: "frontend", title: "Frontend", group: "Engineering" },
  { id: "landing", title: "Landing", group: "Go-to-market" },
  { id: "pricing", title: "Pricing", group: "Go-to-market" },
  { id: "kpis", title: "KPIs", group: "Go-to-market" },
  { id: "roadmap", title: "Roadmap", group: "Go-to-market" },
  { id: "legal", title: "Legal", group: "Operations" },
  { id: "qa", title: "QA", group: "Operations" },
];

export function createVentureDraft(params: {
  ideaText: string;
  intelligenceReport: ForgeIntelligenceReport;
  discoveryAnswers?: DiscoveryAnswerMap | null;
  discoveryContext?: DiscoveryContext | null;
}): VentureProject {
  const now = new Date().toISOString();
  const report = params.intelligenceReport;

  return {
    id: crypto.randomUUID(),
    ideaText: params.ideaText,
    name: report.projectName,
    description: params.ideaText,
    category: report.category as AppCategory,
    targetAudience: report.targetAudience,
    status: "intelligence",
    createdAt: now,
    updatedAt: now,
    intelligenceReport: report,
    analysis: {
      tags: report.tags,
      market: {
        mercadoEstimado: report.market.tamEstimate,
        competencia: report.market.competitionLevel,
        nivelInnovacion: report.market.innovationLevel,
        complejidadTecnica: report.technicalComplexity,
        probabilidadExito: report.market.successProbability,
        tiempoMvp: report.estimatedMvpTime,
        costeDesarrollo: report.estimatedDevelopmentCost,
        modeloNegocio: report.recommendedBusinessModel,
        escalabilidad: report.market.scalability,
      },
      category: report.category,
      targetAudience: report.targetAudience,
      projectName: report.projectName,
    },
    founderAdvisor: mapFounderAdvisorReport(report.founderAdvisor),
    intelligenceAccepted: false,
    discoveryAnswers: params.discoveryAnswers ?? null,
    discoveryContext: params.discoveryContext ?? null,
    sections: [],
  };
}
