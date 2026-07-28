import { detectTags } from "@/lib/intelligence/heuristics";
import { isC2CMarketplaceIdea, isMarketplaceIdea, MARKETPLACE_PATTERN } from "@/lib/intelligence/marketplace-patterns";
import type { IdeaClassification } from "./types";

export { C2C_MARKETPLACE_PATTERN, MARKETPLACE_PATTERN } from "@/lib/intelligence/marketplace-patterns";

const SAAS_SIGNAL_PATTERN =
  /\bsaas\b|software\s+como\s+servicio|herramienta\s+para\s+empresas|dashboard\s+para|suscripci[oó]n\s+mensual|gesti[oó]n\s+interna|crm|erp\b/i;

function hasSignal(text: string, pattern: RegExp): boolean {
  return pattern.test(text.toLowerCase());
}

export function classifyIdeaDiscovery(ideaText: string): IdeaClassification {
  const text = ideaText.trim();
  const lower = text.toLowerCase();
  const tags = detectTags(text);
  const tagIds = tags.map((t) => t.id);
  const signals: string[] = [];

  const isC2C = isC2CMarketplaceIdea(text);
  const isMarketplace = isMarketplaceIdea(text) || tagIds.includes("marketplace");
  const isSaaS = !isMarketplace && (tagIds.includes("saas") || hasSignal(text, SAAS_SIGNAL_PATTERN));
  const isB2B = tagIds.includes("b2b") || /\bempresas\b|\bb2b\b|\bpymes\b/i.test(lower);
  const isMobile = tagIds.includes("mobile") || /\bapp\b|m[oó]vil|ios|android/i.test(lower);
  const isWeb = tagIds.includes("web") || /\bweb\b|online|plataforma/i.test(lower);

  if (isC2C) signals.push("C2C / segunda mano");
  if (isMarketplace) signals.push("Marketplace");
  if (isSaaS) signals.push("SaaS");
  if (isB2B) signals.push("B2B");
  if (isMobile) signals.push("Mobile");
  if (isWeb) signals.push("Web");

  const channels: string[] = [];
  if (isWeb || isMarketplace) channels.push("Web");
  if (isMobile || isMarketplace || isC2C) channels.push("Mobile");
  if (channels.length === 0) channels.push("Web");

  if (isC2C || (isMarketplace && !isB2B)) {
    return {
      productType: isC2C ? "Marketplace C2C" : "Marketplace",
      marketType: isC2C ? "C2C (consumidor a consumidor)" : "Marketplace bilateral",
      probableCustomer: isB2B
        ? "Empresas y particulares en la plataforma"
        : "Particulares compradores y vendedores",
      probableBusinessModel: isC2C
        ? "Comisión por transacción / anuncios destacados"
        : "Comisión / suscripción supply-side",
      channels: [...new Set(channels)],
      confidence: isC2C ? 0.88 : 0.75,
      signals,
    };
  }

  if (isSaaS || tagIds.includes("crm") || tagIds.includes("erp") || tagIds.includes("dashboard")) {
    return {
      productType: tagIds.includes("crm") ? "CRM" : tagIds.includes("erp") ? "ERP" : "SaaS",
      marketType: isB2B ? "B2B" : "B2B/B2C",
      probableCustomer: isB2B ? "Empresas y equipos" : "Profesionales y pymes",
      probableBusinessModel: "Suscripción recurrente",
      channels: [...new Set(channels)],
      confidence: 0.72,
      signals,
    };
  }

  if (tagIds.includes("ai")) {
    return {
      productType: "Producto con IA",
      marketType: isB2B ? "B2B" : "B2C",
      probableCustomer: isB2B ? "Equipos con workflow repetitivo" : "Usuarios finales",
      probableBusinessModel: "Suscripción o freemium",
      channels: [...new Set(channels)],
      confidence: 0.65,
      signals,
    };
  }

  return {
    productType: "Producto digital (por definir)",
    marketType: isB2B ? "B2B" : "B2C",
    probableCustomer: isB2B ? "Empresas" : "Consumidores digitales",
    probableBusinessModel: "Por validar",
    channels: [...new Set(channels)],
    confidence: 0.45,
    signals: signals.length ? signals : ["Definición amplia"],
  };
}
