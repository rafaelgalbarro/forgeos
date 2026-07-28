import type { VentureProject } from "@/lib/domain/venture";
import type { Pattern, PatternType } from "../types";
import { STORAGE_KEYS } from "../memory/types";
import { readStorage, writeStorage } from "../memory/storage";

function textMentions(text: string, terms: string[]): boolean {
  const lower = text.toLowerCase();
  return terms.some((t) => lower.includes(t));
}

function detectSaasPreference(ventures: VentureProject[]): Pattern | null {
  const matches = ventures.filter((v) => {
    const model = v.intelligenceReport?.recommendedBusinessModel ?? "";
    const category = String(v.category);
    return textMentions(`${model} ${category}`, ["saas", "suscripción", "subscription"]);
  });
  if (matches.length === 0) return null;
  const pct = Math.round((matches.length / ventures.length) * 100);
  return {
    id: "pattern-saas",
    type: "saas_preference",
    label: "Preferencia SaaS",
    description: `${pct}% de ventures usan o recomiendan modelo SaaS`,
    ventureIds: matches.map((v) => v.id),
    confidence: Math.min(0.95, matches.length / ventures.length + 0.3),
    detectedAt: new Date().toISOString(),
  };
}

function detectStripePricing(ventures: VentureProject[]): Pattern | null {
  const matches = ventures.filter((v) => {
    const pricing = v.sections.find((s) => s.id === "pricing")?.content ?? "";
    const hints = (v.discoveryContext?.monetizationHints ?? []).join(" ");
    return textMentions(`${pricing} ${hints}`, ["stripe", "tarjeta", "pago online"]);
  });
  if (matches.length === 0) return null;
  return {
    id: "pattern-stripe",
    type: "stripe_pricing",
    label: "Stripe en pricing",
    description: `${matches.length} venture(s) mencionan Stripe o pagos online`,
    ventureIds: matches.map((v) => v.id),
    confidence: 0.7,
    detectedAt: new Date().toISOString(),
  };
}

function detectMarketplacePreference(ventures: VentureProject[]): Pattern | null {
  const matches = ventures.filter((v) => {
    const model = v.intelligenceReport?.recommendedBusinessModel ?? "";
    const idea = v.ideaText;
    return textMentions(`${model} ${idea}`, ["marketplace", "plataforma", "two-sided", "dos lados"]);
  });
  if (matches.length === 0) return null;
  return {
    id: "pattern-marketplace",
    type: "marketplace_preference",
    label: "Preferencia marketplace",
    description: `${matches.length} venture(s) orientados a marketplace/plataforma`,
    ventureIds: matches.map((v) => v.id),
    confidence: 0.65,
    detectedAt: new Date().toISOString(),
  };
}

function detectBuildDelay(ventures: VentureProject[]): Pattern[] {
  const patterns: Pattern[] = [];
  for (const v of ventures) {
    const days = Math.round(
      (new Date(v.updatedAt).getTime() - new Date(v.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );
    const hasBuild = v.sections.some(
      (s) => ["arquitectura", "backend", "frontend"].includes(s.id) && s.content.trim()
    );
    if (days > 14 && !hasBuild && v.status !== "ready") {
      patterns.push({
        id: `pattern-build-delay-${v.id}`,
        type: "build_delay",
        label: "Retraso en build",
        description: `${v.name}: ${days} días sin secciones de build`,
        ventureIds: [v.id],
        confidence: 0.8,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return patterns;
}

function detectIncompleteDiscovery(ventures: VentureProject[]): Pattern[] {
  const patterns: Pattern[] = [];
  for (const v of ventures) {
    const answerCount = v.discoveryContext?.answers.length ?? 0;
    const score = v.ventureSimulatorResult?.startupScore;
    if (answerCount < 2 && score !== undefined && score < 55) {
      patterns.push({
        id: `pattern-incomplete-discovery-${v.id}`,
        type: "incomplete_discovery",
        label: "Discovery incompleto",
        description: `${v.name}: discovery parcial correlaciona con score bajo (${score})`,
        ventureIds: [v.id],
        confidence: 0.75,
        detectedAt: new Date().toISOString(),
      });
    }
  }
  return patterns;
}

export function detectPatterns(ventures: VentureProject[]): Pattern[] {
  if (ventures.length === 0) return [];

  const patterns: Pattern[] = [];
  const saas = detectSaasPreference(ventures);
  if (saas) patterns.push(saas);
  const stripe = detectStripePricing(ventures);
  if (stripe) patterns.push(stripe);
  const marketplace = detectMarketplacePreference(ventures);
  if (marketplace) patterns.push(marketplace);
  patterns.push(...detectBuildDelay(ventures));
  patterns.push(...detectIncompleteDiscovery(ventures));

  writeStorage(STORAGE_KEYS.patterns, patterns);
  return patterns;
}

export function getCachedPatterns(): Pattern[] {
  return readStorage<Pattern[]>(STORAGE_KEYS.patterns, []);
}

export function getPatternsForVenture(ventureId: string): Pattern[] {
  return getCachedPatterns().filter((p) => p.ventureIds.includes(ventureId));
}

export function getPatternTypeLabel(type: PatternType): string {
  const labels: Record<PatternType, string> = {
    saas_preference: "SaaS",
    stripe_pricing: "Stripe",
    marketplace_preference: "Marketplace",
    build_delay: "Retraso build",
    incomplete_discovery: "Discovery incompleto",
  };
  return labels[type];
}
