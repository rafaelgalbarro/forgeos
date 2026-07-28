import { getKnowledgeByDomain } from "@/lib/knowledge/knowledge-queries";
import type {
  DiscoveryQuestion,
  DefinitionRisk,
  IdeaClassification,
  MissingDecision,
} from "./types";

function q(
  id: string,
  question: string,
  reason: string,
  type: DiscoveryQuestion["type"],
  priority: DiscoveryQuestion["priority"],
  impacts: string[],
  options?: string[]
): DiscoveryQuestion {
  return { id, question, reason, type, priority, impacts, options };
}

function marketplaceC2CQuestions(): DiscoveryQuestion[] {
  return [
    q(
      "c2c-model-reference",
      "¿Será tipo Wallapop, Vinted, eBay o un marketplace vertical?",
      "El modelo de referencia define UX, confianza y monetización.",
      "single_choice",
      "high",
      ["productType", "ux", "competition"],
      ["Wallapop / generalista", "Vinted / moda segunda mano", "eBay / subastas y C2C", "Vertical (una categoría)", "Otro"]
    ),
    q(
      "c2c-supply-side",
      "¿Quién publicará productos: personas, empresas o ambos?",
      "El lado oferta determina onboarding, verificación y go-to-market.",
      "single_choice",
      "high",
      ["marketType", "mvpScope", "legal"],
      ["Solo particulares", "Solo empresas/tiendas", "Ambos", "Por definir"]
    ),
    q(
      "c2c-monetization",
      "¿Cómo monetizarás: comisión, anuncios destacados, suscripción, publicidad?",
      "La monetización debe alinearse con el comportamiento del usuario C2C.",
      "multiple_choice",
      "high",
      ["businessModel", "pricing", "revenue"],
      ["Comisión por venta", "Anuncios destacados", "Suscripción vendedores", "Publicidad", "Freemium + premium"]
    ),
    q(
      "c2c-vertical",
      "¿Será generalista o especializado en una categoría?",
      "Los marketplaces suelen ganar por densidad en un vertical antes de expandir.",
      "single_choice",
      "medium",
      ["positioning", "competition", "mvpScope"],
      ["Generalista", "Moda", "Electrónica", "Hogar", "Motor", "Otra categoría"]
    ),
    q(
      "c2c-trust",
      "¿Cómo resolverás confianza, pagos y disputas?",
      "En C2C, la fricción de confianza puede matar la retención.",
      "free_text",
      "high",
      ["payments", "legal", "operations"],
      ["Pagos en plataforma", "Escrow", "Reputación y reviews", "Soporte de disputas", "Sin pagos integrados (riesgo)"]
    ),
  ];
}

function marketplaceQuestions(): DiscoveryQuestion[] {
  return [
    q(
      "mp-wedge",
      "¿Qué lado activas primero: oferta o demanda?",
      "Los marketplaces fallan cuando intentan crecer ambos lados a la vez.",
      "single_choice",
      "high",
      ["goToMarket", "mvpScope"],
      ["Oferta primero", "Demanda primero", "Ciudad/nicho específico", "No lo sé"]
    ),
    q(
      "mp-monetization",
      "¿Cuál es tu modelo de ingresos principal?",
      "Define pricing y roadmap del MVP.",
      "single_choice",
      "high",
      ["businessModel", "pricing"],
      ["Comisión", "Suscripción supply-side", "Leads premium", "Publicidad", "Híbrido"]
    ),
    q(
      "mp-geo",
      "¿Cuál es tu mercado inicial (ciudad, país, vertical)?",
      "La densidad local es más importante que la cobertura amplia.",
      "free_text",
      "medium",
      ["market", "goToMarket"],
    ),
  ];
}

function saasQuestions(): DiscoveryQuestion[] {
  const bmCatalog = getKnowledgeByDomain("business-models").slice(0, 3);
  const modelHint = bmCatalog.map((e) => e.title).join(", ") || "SaaS, Freemium";

  return [
    q(
      "saas-pain",
      "¿Cuál es el dolor específico y medible que resuelves?",
      "Un SaaS necesita un job-to-be-done claro para evitar scope creep.",
      "free_text",
      "high",
      ["problemStatement", "mvpScope"],
    ),
    q(
      "saas-customer",
      "¿Quién paga: usuario final, manager, o empresa?",
      "El pagador define ciclo de venta y pricing.",
      "single_choice",
      "high",
      ["targetCustomer", "pricing"],
      ["Usuario final", "Manager / equipo", "Empresa (B2B)", "Por definir"]
    ),
    q(
      "saas-model",
      `¿Qué modelo encaja mejor? (referencias: ${modelHint})`,
      "Contexto del Knowledge Engine — orientativo, no definitivo.",
      "single_choice",
      "medium",
      ["businessModel"],
      ["Suscripción B2B", "Freemium", "Usage-based", "Licencia", "Por validar"]
    ),
  ];
}

function genericQuestions(missing: MissingDecision[]): DiscoveryQuestion[] {
  const questions: DiscoveryQuestion[] = [
    q(
      "generic-problem",
      "¿Cuál es el único problema que resuelves en la v1?",
      "Sin un job principal, el MVP se diluye.",
      "free_text",
      "high",
      ["mvpScope", "problemStatement"],
    ),
    q(
      "generic-customer",
      "¿Quién es tu usuario ideal y con qué frecuencia tiene este problema?",
      "La frecuencia del dolor predice retención.",
      "free_text",
      "high",
      ["targetCustomer", "market"],
    ),
  ];

  if (missing.some((m) => m.id === "monetization")) {
    questions.push(
      q(
        "generic-monetization",
        "¿Cómo piensas monetizar?",
        "Decisión faltante detectada por el motor de discovery.",
        "single_choice",
        "high",
        ["businessModel", "pricing"],
        ["Suscripción", "Comisión", "Freemium", "Publicidad", "Por definir"]
      )
    );
  }

  return questions;
}

export function generateDiscoveryQuestions(
  ideaText: string,
  classification: IdeaClassification,
  missingDecisions: MissingDecision[],
  definitionRisks: DefinitionRisk[]
): DiscoveryQuestion[] {
  let pool: DiscoveryQuestion[] = [];

  if (classification.productType === "Marketplace C2C") {
    pool = marketplaceC2CQuestions();
  } else if (classification.productType.includes("Marketplace")) {
    pool = marketplaceQuestions();
  } else if (classification.productType.includes("SaaS") || classification.productType === "CRM" || classification.productType === "ERP") {
    pool = saasQuestions();
  } else {
    pool = genericQuestions(missingDecisions);
  }

  if (definitionRisks.some((r) => r.id === "risk-vague") && !pool.some((p) => p.id === "generic-problem")) {
    pool.unshift(
      q(
        "clarify-flow",
        "¿Puedes describir el flujo principal del usuario en 3 pasos?",
        "La idea es demasiado amplia para construir sin más definición.",
        "free_text",
        "high",
        ["mvpScope", "ux"]
      )
    );
  }

  const priorityOrder: Record<DiscoveryQuestion["priority"], number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...pool]
    .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
    .slice(0, 8);
}
