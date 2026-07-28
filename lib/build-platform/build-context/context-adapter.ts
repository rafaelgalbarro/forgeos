/** Build Context — read-only adapters from existing venture modules (Epic 6.0). */

import type { VentureProject } from "@/lib/domain/venture";
import { generateBuildPlan } from "@/lib/build-plan/build-plan-generator";
import type { ProductPRD } from "@/lib/ai/types/product";
import type { ResearchReport } from "@/lib/ai/types/research";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { ForgeIntelligenceReport } from "@/lib/intelligence/types";
import type { VentureSimulatorResult } from "@/lib/venture-simulator";
import type {
  BuildContextAdapterInput,
  BuildContextOrigin,
  BuildContextSectionId,
  BuildContextSectionStatus,
} from "./types";

export interface AdaptedSectionSlice {
  id: BuildContextSectionId;
  data: unknown;
  origin: BuildContextOrigin;
  status: BuildContextSectionStatus;
  sourceModule: string;
}

function hasContent(value: unknown): boolean {
  if (value == null) return false;
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

function statusFromDepth(
  requiredFields: unknown[],
  optionalFields: unknown[] = []
): BuildContextSectionStatus {
  const reqFilled = requiredFields.filter(hasContent).length;
  const optFilled = optionalFields.filter(hasContent).length;
  if (reqFilled === 0) return "empty";
  if (reqFilled === requiredFields.length && optFilled >= optionalFields.length * 0.5) {
    return "complete";
  }
  return "partial";
}

export function ventureToAdapterInput(venture: VentureProject): BuildContextAdapterInput {
  return {
    ventureId: venture.id,
    ventureName: venture.name,
    ideaText: venture.ideaText,
    description: venture.description,
    targetAudience: venture.targetAudience,
    discoveryContext: venture.discoveryContext,
    researchReport: venture.researchReport,
    productPRD: venture.productPRD,
    intelligenceReport: venture.intelligenceReport,
    simulatorResult: venture.ventureSimulatorResult,
    sections: venture.sections.map((s) => ({ id: s.id, content: s.content })),
  };
}

export function adaptDiscovery(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const ctx = input.discoveryContext as DiscoveryContext | undefined;
  const data = ctx
    ? {
        clarifiedDecisions: ctx.clarifiedDecisions,
        remainingQuestions: ctx.remainingQuestions,
        inferredProductType: ctx.inferredProductType,
        inferredBusinessModel: ctx.inferredBusinessModel,
        answers: ctx.answers ?? [],
      }
    : null;

  return {
    id: "discovery",
    data,
    origin: "discovery",
    status: statusFromDepth(
      [ctx?.inferredProductType, ctx?.answers?.length],
      [ctx?.clarifiedDecisions, ctx?.remainingQuestions]
    ),
    sourceModule: "lib/discovery",
  };
}

export function adaptResearch(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const report = input.researchReport as ResearchReport | undefined;
  const data = report
    ? {
        marketSummary: report.marketSummary,
        targetSegments: report.targetSegments,
        marketRisks: report.marketRisks,
        opportunities: report.opportunities,
        differentiationAngles: report.differentiationAngles,
        validationPlan: report.validationPlan,
      }
    : null;

  return {
    id: "research",
    data,
    origin: "research",
    status: statusFromDepth(
      [report?.marketSummary, report?.targetSegments],
      [report?.opportunities, report?.validationPlan]
    ),
    sourceModule: "lib/ai/types/research",
  };
}

export function adaptCompetitors(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const report = input.researchReport as ResearchReport | undefined;
  const competitors = report?.competitors ?? [];
  const data = competitors.length > 0 ? { competitors } : null;

  return {
    id: "competitors",
    data,
    origin: "research",
    status: competitors.length >= 2 ? "complete" : competitors.length === 1 ? "partial" : "empty",
    sourceModule: "lib/ai/types/research",
  };
}

export function adaptBusinessModel(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const ctx = input.discoveryContext as DiscoveryContext | undefined;
  const intel = input.intelligenceReport as ForgeIntelligenceReport | null | undefined;
  const data = {
    inferredBusinessModel: ctx?.inferredBusinessModel,
    monetizationHints: ctx?.monetizationHints ?? [],
    intelligenceBusinessModel: intel?.recommendedBusinessModel ?? intel?.businessModel ?? null,
    targetAudience: input.targetAudience,
  };

  return {
    id: "businessModel",
    data,
    origin: ctx ? "discovery" : intel ? "intelligence" : "venture",
    status: statusFromDepth(
      [ctx?.inferredBusinessModel, input.targetAudience],
      [ctx?.monetizationHints, intel?.businessModel]
    ),
    sourceModule: "lib/discovery + lib/intelligence",
  };
}

export function adaptBrand(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const section = input.sections?.find((s) => s.id === "landing" || s.id === "resumen");
  const data = section?.content
    ? { summary: section.content.slice(0, 500), tone: "pending" }
    : { name: input.ventureName, tagline: input.description };

  return {
    id: "brand",
    data,
    origin: section ? "venture" : "manual",
    status: section?.content ? "partial" : hasContent(input.description) ? "partial" : "empty",
    sourceModule: "lib/domain/venture-sections",
  };
}

export function adaptUsers(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const ctx = input.discoveryContext as DiscoveryContext | undefined;
  const data = {
    targetAudience: input.targetAudience,
    targetCustomerHints: ctx?.targetCustomerHints ?? [],
    segments: (input.researchReport as ResearchReport | undefined)?.targetSegments ?? [],
  };

  return {
    id: "users",
    data,
    origin: "venture",
    status: statusFromDepth(
      [input.targetAudience],
      [ctx?.targetCustomerHints, (data.segments as string[]).length]
    ),
    sourceModule: "lib/domain/venture",
  };
}

export function adaptPersonas(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const prd = input.productPRD as ProductPRD | undefined;
  const data = prd
    ? { targetCustomer: prd.targetCustomer, userStories: prd.userStories?.slice(0, 5) ?? [] }
    : null;

  return {
    id: "personas",
    data,
    origin: prd ? "product" : "manual",
    status: statusFromDepth([prd?.targetCustomer], [prd?.userStories]),
    sourceModule: "lib/ai/types/product",
  };
}

export function adaptProductPrd(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const prd = input.productPRD as ProductPRD | undefined;
  return {
    id: "productPrd",
    data: prd ?? null,
    origin: prd ? "product" : "manual",
    status: statusFromDepth(
      [prd?.executiveSummary, prd?.mvpScope],
      [prd?.userStories, prd?.successMetrics]
    ),
    sourceModule: "lib/ai/types/product",
  };
}

export function adaptArchitecture(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const section = input.sections?.find((s) => s.id === "arquitectura");
  const data = section?.content ? { markdown: section.content } : null;

  return {
    id: "architecture",
    data,
    origin: section ? "venture" : "manual",
    status: section?.content ? "partial" : "empty",
    sourceModule: "lib/domain/venture-sections",
  };
}

export function adaptUx(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const prd = input.productPRD as ProductPRD | undefined;
  const wireframe = input.sections?.find((s) => s.id === "wireframes" || s.id === "ux");
  const data = {
    mainScreens: prd?.mainScreens ?? [],
    coreFlows: prd?.coreFlows ?? [],
    wireframes: wireframe?.content ?? null,
  };

  return {
    id: "ux",
    data,
    origin: prd || wireframe ? "product" : "manual",
    status: statusFromDepth([prd?.mainScreens, prd?.coreFlows], [wireframe?.content]),
    sourceModule: "lib/ai/types/product",
  };
}

export function adaptKnowledge(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const intel = input.intelligenceReport as ForgeIntelligenceReport | null | undefined;
  const data = intel
    ? {
        tags: intel.tags ?? [],
        market: intel.market,
        competition: intel.competition,
      }
    : { refs: [] };

  return {
    id: "knowledge",
    data,
    origin: intel ? "intelligence" : "knowledge",
    status: intel ? "partial" : "empty",
    sourceModule: "lib/intelligence + lib/knowledge",
  };
}

export function adaptMemory(input: BuildContextAdapterInput): AdaptedSectionSlice {
  return {
    id: "memory",
    data: { ventureId: input.ventureId, note: "Runtime memory wired at execution time" },
    origin: "runtime",
    status: "partial",
    sourceModule: "lib/ai-orchestration/executive-memory-writer",
  };
}

export function adaptDecisionGraph(input: BuildContextAdapterInput): AdaptedSectionSlice {
  return {
    id: "decisionGraph",
    data: { ventureId: input.ventureId, note: "Decision graph nodes loaded at runtime" },
    origin: "runtime",
    status: "partial",
    sourceModule: "lib/ai-orchestration/decision-graph-writer",
  };
}

export function adaptWorkers(input: BuildContextAdapterInput): AdaptedSectionSlice {
  return {
    id: "workers",
    data: {
      availableWorkers: [
        "research",
        "product",
        "ux",
        "backend",
        "frontend",
        "qa",
        "build",
        "deployment",
      ],
      ventureId: input.ventureId,
    },
    origin: "runtime",
    status: "partial",
    sourceModule: "lib/runtime/workers",
  };
}

export function adaptBuildPlan(venture: VentureProject): AdaptedSectionSlice {
  try {
    const plan = generateBuildPlan(venture);
    return {
      id: "buildPlan",
      data: plan,
      origin: "build-plan",
      status: plan.mvpChecklist?.length ? "complete" : "partial",
      sourceModule: "lib/build-plan",
    };
  } catch {
    return {
      id: "buildPlan",
      data: null,
      origin: "build-plan",
      status: "empty",
      sourceModule: "lib/build-plan",
    };
  }
}

export function adaptDeploymentTarget(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const sim = input.simulatorResult as VentureSimulatorResult | undefined;
  const data = {
    recommended: "vercel",
    alternatives: ["docker", "railway", "supabase"],
    simulatorRecommendation: sim?.recommendation ?? null,
  };

  return {
    id: "deploymentTarget",
    data,
    origin: sim ? "simulator" : "manual",
    status: sim ? "partial" : "empty",
    sourceModule: "lib/venture-simulator",
  };
}

export function adaptAnalytics(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const prd = input.productPRD as ProductPRD | undefined;
  const kpiSection = input.sections?.find((s) => s.id === "kpis");
  const data = {
    successMetrics: prd?.successMetrics ?? [],
    kpis: kpiSection?.content ?? null,
  };

  return {
    id: "analytics",
    data,
    origin: prd || kpiSection ? "product" : "manual",
    status: statusFromDepth([prd?.successMetrics], [kpiSection?.content]),
    sourceModule: "lib/ai/types/product",
  };
}

export function adaptSecurity(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const ctx = input.discoveryContext as DiscoveryContext | undefined;
  const legal = input.sections?.find((s) => s.id === "legal");
  const data = {
    trustAndSafetyHints: ctx?.trustAndSafetyHints ?? [],
    legalNotes: legal?.content ?? null,
  };

  return {
    id: "security",
    data,
    origin: ctx || legal ? "discovery" : "manual",
    status: statusFromDepth([ctx?.trustAndSafetyHints], [legal?.content]),
    sourceModule: "lib/discovery + venture-sections",
  };
}

export function adaptInfrastructure(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const arch = input.sections?.find((s) => s.id === "arquitectura");
  const backend = input.sections?.find((s) => s.id === "backend");
  const data = {
    architectureNotes: arch?.content?.slice(0, 300) ?? null,
    backendNotes: backend?.content?.slice(0, 300) ?? null,
    defaultStack: ["Next.js", "PostgreSQL", "Vercel"],
  };

  return {
    id: "infrastructure",
    data,
    origin: arch || backend ? "venture" : "manual",
    status: statusFromDepth([arch?.content, backend?.content]),
    sourceModule: "lib/domain/venture-sections",
  };
}

export function adaptQa(input: BuildContextAdapterInput): AdaptedSectionSlice {
  const qa = input.sections?.find((s) => s.id === "qa");
  const data = qa?.content
    ? { checklist: qa.content }
    : { checklist: ["Accessibility", "Performance", "Security smoke tests"] };

  return {
    id: "qa",
    data,
    origin: qa ? "venture" : "manual",
    status: qa?.content ? "partial" : "empty",
    sourceModule: "lib/domain/venture-sections",
  };
}

export function adaptAllSectionsFromVenture(venture: VentureProject): AdaptedSectionSlice[] {
  const input = ventureToAdapterInput(venture);
  return [
    adaptDiscovery(input),
    adaptResearch(input),
    adaptCompetitors(input),
    adaptBusinessModel(input),
    adaptBrand(input),
    adaptUsers(input),
    adaptPersonas(input),
    adaptProductPrd(input),
    adaptArchitecture(input),
    adaptUx(input),
    adaptKnowledge(input),
    adaptMemory(input),
    adaptDecisionGraph(input),
    adaptWorkers(input),
    adaptBuildPlan(venture),
    adaptDeploymentTarget(input),
    adaptAnalytics(input),
    adaptSecurity(input),
    adaptInfrastructure(input),
    adaptQa(input),
  ];
}
