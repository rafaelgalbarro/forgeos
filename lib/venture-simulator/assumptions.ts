import type { ProductPRD } from "@/lib/ai/types/product";
import type { ResearchReport } from "@/lib/ai/types/research";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { ForgeIntelligenceReport } from "@/lib/intelligence/types";
import { classifyIdea, hashScore } from "@/lib/intelligence/heuristics";
import type { SimulatorAssumptions, VentureSimulatorInput } from "./types";

function isMarketplaceModel(text: string, intel?: ForgeIntelligenceReport | null, discovery?: DiscoveryContext | null): boolean {
  const combined = `${text} ${discovery?.inferredProductType ?? ""} ${intel?.recommendedBusinessModel ?? ""}`.toLowerCase();
  return /marketplace|c2c|comisi[oó]n|wallapop|vinted/.test(combined) || classifyIdea(text).isMarketplace;
}

function isB2B(text: string, intel?: ForgeIntelligenceReport | null): boolean {
  return classifyIdea(text).isB2B || intel?.tags.some((t) => t.id === "b2b") === true;
}

function isSaaS(text: string, intel?: ForgeIntelligenceReport | null): boolean {
  return intel?.tags.some((t) => t.id === "saas") === true || /\bsaas\b/i.test(text);
}

export function buildSimulatorAssumptions(input: VentureSimulatorInput): SimulatorAssumptions {
  const { ideaText, discoveryContext, intelligenceReport, researchReport, productPRD, knowledgeRefs } = input;
  const h = hashScore(ideaText, 13);
  const marketplace = isMarketplaceModel(ideaText, intelligenceReport, discoveryContext);
  const b2b = isB2B(ideaText, intelligenceReport);
  const saas = isSaaS(ideaText, intelligenceReport);

  let businessModel = intelligenceReport?.recommendedBusinessModel ?? discoveryContext?.inferredBusinessModel ?? "Por validar";
  if (marketplace) businessModel = "Comisión por transacción (marketplace)";
  else if (saas) businessModel = "Suscripción SaaS";
  else if (b2b) businessModel = "Suscripción B2B";

  const competitionLevel = intelligenceReport?.market.competitionLevel.toLowerCase() ?? "";
  const competitionPenalty =
    competitionLevel.includes("alta") || (researchReport?.competitors.length ?? 0) >= 4
      ? 12
      : competitionLevel.includes("media")
        ? 6
        : 2;

  const complexityText = intelligenceReport?.technicalComplexity.toLowerCase() ?? "";
  const hasPayments = discoveryContext?.trustAndSafetyHints.some((t) => /pago/i.test(t)) ?? false;
  const complexityPenalty =
    complexityText.includes("alta") || hasPayments
      ? 10
      : complexityText.includes("media")
        ? 5
        : 0;

  const discoveryBonus = Math.min(15, (discoveryContext?.answers.length ?? 0) * 3);
  const researchBonus = researchReport ? 8 : 0;
  const productBonus = productPRD ? 6 : 0;
  const knowledgeBonus = Math.min(5, (knowledgeRefs?.length ?? 0));

  const baseYear1Users = marketplace
    ? 800 + (h % 400)
    : b2b
      ? 40 + (h % 30)
      : saas
        ? 120 + (h % 80)
        : 200 + (h % 150);

  const growthMultiplier = marketplace ? 2.2 : b2b ? 1.8 : 2.5;
  const baseYear2Users = Math.round(baseYear1Users * growthMultiplier);

  const revenuePerUserYear1 = marketplace ? 18 + (h % 12) : b2b ? 420 + (h % 180) : saas ? 96 + (h % 48) : 45 + (h % 30);
  const revenuePerUserYear2 = Math.round(revenuePerUserYear1 * (marketplace ? 1.35 : 1.55));

  const baseCAC = marketplace ? 28 + (h % 15) : b2b ? 180 + (h % 120) : saas ? 65 + (h % 40) : 40 + (h % 25);
  const baseConversion = marketplace ? 1.2 + (h % 8) / 10 : b2b ? 3.5 + (h % 15) / 10 : 2.5 + (h % 12) / 10;
  const baseChurnMonthly = marketplace ? 8 + (h % 4) : b2b ? 2 + (h % 2) : saas ? 4 + (h % 3) : 6 + (h % 3);

  const primaryRisk =
    researchReport?.marketRisks[0] ??
    intelligenceReport?.risks[0]?.title ??
    (marketplace ? "Cold start bilateral — oferta y demanda" : "Adquisición de primeros usuarios");

  const acquisitionComplexity = marketplace
    ? "Alta — dos lados del mercado"
    : b2b
      ? "Media-alta — ventas consultivas"
      : competitionPenalty >= 10
        ? "Alta — mercado saturado"
        : "Media — canales digitales";

  return {
    businessModel,
    revenuePerUserYear1,
    revenuePerUserYear2,
    baseYear1Users,
    baseYear2Users,
    baseCAC,
    baseConversion,
    baseChurnMonthly,
    monthlyBurnEstimate: 3500,
    competitionPenalty,
    complexityPenalty,
    discoveryBonus,
    researchBonus,
    productBonus,
    knowledgeBonus,
    primaryRisk,
    acquisitionComplexity,
  };
}

export function listDataSources(input: VentureSimulatorInput): string[] {
  const sources = ["ideaText", "heurísticas Forge Intelligence"];
  if (input.discoveryContext?.answers.length) sources.push("discoveryContext");
  if (input.intelligenceReport) sources.push("intelligenceReport");
  if (input.researchReport) sources.push("researchReport");
  if (input.productPRD) sources.push("productPRD");
  if (input.knowledgeRefs?.length) sources.push("knowledgeRefs");
  return sources;
}
