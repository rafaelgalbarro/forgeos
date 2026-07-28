import type { DetectedTag } from "@/lib/intelligence/types";
import type { FounderRecommendation } from "@/lib/intelligence/types";
import type { DiscoveryContext } from "./types";
import { getDiscoveryScoreAdjustment } from "./discovery-context";

export function applyDiscoveryToTags(tags: DetectedTag[], context: DiscoveryContext | null): DetectedTag[] {
  if (!context) return tags;

  const result = [...tags];
  const ensure = (id: string, label: string, category: DetectedTag["category"]) => {
    if (!result.some((t) => t.id === id)) {
      result.push({ id, label, category });
    }
  };

  const productType = context.inferredProductType.toLowerCase();

  if (productType.includes("marketplace") || productType.includes("c2c")) {
    ensure("marketplace", "Marketplace", "product");
    ensure("web", "Web", "tech");
  }
  if (productType.includes("c2c")) {
    ensure("c2c", "C2C", "business");
    ensure("b2c", "B2C", "business");
    ensure("mobile", "Mobile", "tech");
  }

  return result;
}

export function getDiscoveryFounderRecommendations(
  context: DiscoveryContext | null
): FounderRecommendation[] {
  if (!context || context.answers.length === 0) return [];

  const recs: FounderRecommendation[] = [];

  if (context.inferredProductType.includes("C2C")) {
    recs.push({
      text: `Enfoque confirmado: ${context.inferredProductType}. Prioriza densidad local antes de escalar.`,
      reason: "Decisión explícita del Discovery Answers Loop.",
    });
  }

  if (context.monetizationHints.length > 0) {
    recs.push({
      text: `Monetización elegida: ${context.monetizationHints.join(", ")}.`,
      reason: "El usuario aclaró el modelo de ingresos en discovery.",
    });
  }

  if (context.buildConstraints.some((c) => c.includes("pagos"))) {
    recs.push({
      text: "Incluye pagos y disputas en el diseño del MVP — no los dejes para v2.",
      reason: "El usuario confirmó pagos en plataforma.",
    });
  }

  if (context.platformHints.some((p) => p.includes("vertical"))) {
    recs.push({
      text: "Tu wedge vertical es una ventaja — no diluyas el catálogo al inicio.",
      reason: "Respuesta de discovery sobre especialización.",
    });
  }

  return recs.slice(0, 2);
}

export { getDiscoveryScoreAdjustment };
