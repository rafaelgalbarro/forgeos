/** Venture Factory — 18-stage pipeline orchestration (RC7) */

import { previewDiscovery } from "@/lib/discovery";
import { parseIdeaProfile } from "./idea-context";
import { validateMarket } from "./market-validator";
import { analyzeCompetitors } from "./market-validator/competitors";
import { generatePricing } from "./pricing-engine";
import { generateBusinessModel } from "./business-model";
import { generateNaming } from "./naming-generator";
import { generateBrand } from "./brand-generator";
import { generateLanding } from "./landing-generator";
import { generatePrd } from "./product-generator";
import { generateArchitecture } from "./architecture-generator";
import { generateSoftwarePlan } from "./software-plan-generator";
import { generateDeploymentPreview } from "./launch-manager";
import { generateMarketingPlan } from "./revenue-engine/marketing";
import { generateRevenueDashboard } from "./revenue-engine";
import { scoreVentureHealth } from "./venture-health";
import type {
  VentureFactoryOutput,
  VentureFactoryStage,
  VentureFactoryStageId,
  VentureIdeaContext,
} from "./types";

export const VENTURE_FACTORY_STAGES: VentureFactoryStage[] = [
  { id: "idea", label: "Idea", durationMs: 400 },
  { id: "research", label: "Research", durationMs: 500 },
  { id: "mercado", label: "Mercado", durationMs: 450 },
  { id: "competidores", label: "Competidores", durationMs: 450 },
  { id: "pricing", label: "Pricing", durationMs: 400 },
  { id: "business_model", label: "Business Model", durationMs: 450 },
  { id: "naming", label: "Naming", durationMs: 350 },
  { id: "brand", label: "Brand", durationMs: 400 },
  { id: "landing", label: "Landing", durationMs: 500 },
  { id: "prd", label: "PRD", durationMs: 550 },
  { id: "architecture", label: "Arquitectura", durationMs: 500 },
  { id: "ux", label: "UX", durationMs: 400 },
  { id: "frontend", label: "Frontend", durationMs: 450 },
  { id: "backend", label: "Backend", durationMs: 450 },
  { id: "database", label: "Database", durationMs: 400 },
  { id: "deployment", label: "Deployment", durationMs: 450 },
  { id: "marketing", label: "Marketing", durationMs: 450 },
  { id: "revenue_dashboard", label: "Revenue Dashboard", durationMs: 500 },
];

export function stageMessage(stageId: VentureFactoryStageId, ctx: VentureIdeaContext): string {
  const profile = parseIdeaProfile(ctx.ideaText);
  const messages: Record<VentureFactoryStageId, string> = {
    idea: `Idea recibida: "${ctx.ideaText.slice(0, 60)}…"`,
    research: buildResearchMessage(ctx.ideaText),
    mercado: `Mercado: TAM ${validateMarket(profile).tam}`,
    competidores: `Competidores: ${analyzeCompetitors(profile).length} analizados`,
    pricing: `Pricing: ${generatePricing(profile).plans.length} planes definidos`,
    business_model: "Business Model Canvas generado",
    naming: `Naming: "${generateNaming(profile).primary}" seleccionado`,
    brand: "Identidad de marca — paleta, tono, logo concept",
    landing: "Landing copy + hero + secciones",
    prd: `PRD MVP — ${generatePrd(profile, generateNaming(profile).primary).mvpFeatures.length} features`,
    architecture: `Arquitectura: ${generateArchitecture(profile).stack.slice(0, 3).join(", ")}`,
    ux: `UX: ${generateSoftwarePlan(profile).ux.flows.length} flujos wireframe`,
    frontend: `Frontend: ${generateSoftwarePlan(profile).frontend.pages.length} páginas`,
    backend: `Backend: ${generateSoftwarePlan(profile).backend.routes.length} API routes`,
    database: `Database: ${generateSoftwarePlan(profile).database.tables.length} tablas`,
    deployment: `Deploy preview: ${generateDeploymentPreview(profile).provider}`,
    marketing: `Marketing: ${generateMarketingPlan(profile, generateNaming(profile).primary).channels.length} canales`,
    revenue_dashboard: `Revenue dashboard — proyección ${generateRevenueDashboard(profile).arrProjection}`,
  };
  return messages[stageId];
}

function buildResearchMessage(ideaText: string): string {
  const discovery = previewDiscovery(ideaText);
  if (discovery) {
    return `Research (discovery): score ${discovery.discoveryScore} — ${discovery.classification.productType}`;
  }
  return "Research: análisis de mercado y oportunidad — simulado";
}

/** Build full venture output synchronously (used at pipeline end). */
export function buildVentureOutput(ideaText: string): VentureFactoryOutput {
  const profile = parseIdeaProfile(ideaText);
  const naming = generateNaming(profile);
  const companyName = naming.primary;
  const businessModel = generateBusinessModel(profile, companyName);

  return {
    companyName,
    valueProposition: businessModel.valueProposition,
    market: validateMarket(profile),
    competitors: analyzeCompetitors(profile),
    pricing: generatePricing(profile),
    businessModel,
    brand: generateBrand(profile, companyName),
    landing: generateLanding(profile, companyName, businessModel.valueProposition),
    prd: generatePrd(profile, companyName),
    architecture: generateArchitecture(profile),
    softwarePlan: generateSoftwarePlan(profile),
    deployment: generateDeploymentPreview(profile),
    marketing: generateMarketingPlan(profile, companyName),
    revenue: generateRevenueDashboard(profile),
    health: scoreVentureHealth(profile),
  };
}

export function createVentureContext(command: string): VentureIdeaContext {
  const profile = parseIdeaProfile(command);
  return {
    command,
    ideaText: profile.ideaText,
    vertical: profile.vertical,
    dryRun: true,
    startedAt: new Date().toISOString(),
  };
}
