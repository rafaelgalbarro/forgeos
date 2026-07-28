import { isC2CMarketplaceIdea, isMarketplaceIdea } from "@/lib/intelligence/marketplace-patterns";
import { classifyIdeaDiscovery } from "./idea-classifier";
import type { DefinitionRisk, IdeaClassification, MissingDecision } from "./types";

function mentioned(text: string, patterns: RegExp[]): boolean {
  const lower = text.toLowerCase();
  return patterns.some((p) => p.test(lower));
}

export function detectMissingDecisions(
  ideaText: string,
  classification: IdeaClassification
): MissingDecision[] {
  const text = ideaText.toLowerCase();
  const missing: MissingDecision[] = [];

  const hasMonetization = mentioned(text, [
    /comisi[oó]n|suscripci[oó]n|freemium|publicidad|anuncios?\s+destacados|take\s+rate|cuota|pago\s+mensual/i,
  ]);
  const hasSupplySide = mentioned(text, [
    /vendedores?|particulares|empresas|profesionales|qui[eé]n\s+publica|oferta/i,
  ]);
  const hasVertical = mentioned(text, [
    /vertical|niche|especializado|solo\s+\w+|categor[ií]a\s+concreta|ropa|electr[oó]nica|motor/i,
  ]);
  const hasTrust = mentioned(text, [
    /confianza|pagos|disputas|reputaci[oó]n|escrow|garant[ií]a|verificaci[oó]n/i,
  ]);
  const hasGeo = mentioned(text, [/ciudad|pa[ií]s|barrio|local|espa[nñ]a|regional/i]);

  if (!hasMonetization) {
    missing.push({
      id: "monetization",
      topic: "Monetización",
      description: "No está claro cómo generarás ingresos.",
      severity: "high",
    });
  }

  if (classification.productType.includes("Marketplace") && !hasSupplySide) {
    missing.push({
      id: "supply-side",
      topic: "Lado oferta",
      description: "No está definido quién publica o vende en la plataforma.",
      severity: "high",
    });
  }

  if (classification.productType.includes("Marketplace") && !hasVertical) {
    missing.push({
      id: "vertical-vs-horizontal",
      topic: "Alcance del catálogo",
      description: "No se sabe si será generalista o vertical.",
      severity: "medium",
    });
  }

  if (classification.productType.includes("Marketplace") && !hasTrust) {
    missing.push({
      id: "trust-payments",
      topic: "Confianza y pagos",
      description: "No hay señales sobre pagos, disputas o reputación.",
      severity: "high",
    });
  }

  if (!hasGeo && classification.confidence < 0.7) {
    missing.push({
      id: "geography",
      topic: "Mercado geográfico",
      description: "No está definido el mercado inicial (ciudad, país, global).",
      severity: "medium",
    });
  }

  if (classification.probableBusinessModel === "Por validar") {
    missing.push({
      id: "business-model",
      topic: "Modelo de negocio",
      description: "El modelo de negocio aún es ambiguo.",
      severity: "high",
    });
  }

  return missing;
}

export function detectAmbiguities(ideaText: string, classification: IdeaClassification): string[] {
  const ambiguities: string[] = [];
  const text = ideaText.toLowerCase();

  if (/plataforma/i.test(text) && !isMarketplaceIdea(ideaText)) {
    ambiguities.push("«Plataforma» puede significar marketplace, SaaS o comunidad — no está acotado.");
  }

  if (/app\b/i.test(text) && !/para\s+\w+/i.test(text)) {
    ambiguities.push("Se menciona «app» pero el problema principal no está descrito.");
  }

  if (classification.signals.includes("SaaS") && classification.signals.includes("Marketplace")) {
    ambiguities.push("Hay señales mixtas de SaaS y Marketplace — conviene elegir un wedge.");
  }

  if (ideaText.length < 40) {
    ambiguities.push("La idea es muy corta para inferir el flujo principal del usuario.");
  }

  return ambiguities;
}

export function detectDefinitionRisks(
  ideaText: string,
  classification: IdeaClassification,
  missing: MissingDecision[]
): DefinitionRisk[] {
  const risks: DefinitionRisk[] = [];

  if (missing.some((m) => m.id === "monetization")) {
    risks.push({
      id: "risk-monetization",
      title: "Monetización indefinida",
      description: "Sin modelo de ingresos claro, el MVP puede no ser viable económicamente.",
    });
  }

  if (classification.productType.includes("Marketplace C2C")) {
    risks.push({
      id: "risk-cold-start",
      title: "Cold start bilateral",
      description: "Los marketplaces C2C necesitan densidad local de compradores y vendedores.",
    });
  }

  if (missing.some((m) => m.id === "trust-payments")) {
    risks.push({
      id: "risk-trust",
      title: "Confianza no resuelta",
      description: "En C2C, pagos y disputas son críticos desde el diseño del producto.",
    });
  }

  if (classification.confidence < 0.55) {
    risks.push({
      id: "risk-vague",
      title: "Propuesta difusa",
      description: "La definición actual puede derivar en un MVP demasiado amplio.",
    });
  }

  return risks;
}

export function analyzeDecisions(ideaText: string) {
  const classification = classifyIdeaDiscovery(ideaText);
  const missingDecisions = detectMissingDecisions(ideaText, classification);
  const ambiguities = detectAmbiguities(ideaText, classification);
  const definitionRisks = detectDefinitionRisks(ideaText, classification, missingDecisions);

  return { classification, missingDecisions, ambiguities, definitionRisks };
}
