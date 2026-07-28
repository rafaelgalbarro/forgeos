import type { DetectedTag, TagCategory } from "./types";
import {
  C2C_MARKETPLACE_PATTERN,
  isC2CMarketplaceIdea,
  isMarketplaceIdea,
  MARKETPLACE_PATTERN,
} from "./marketplace-patterns";

interface TagRule {
  id: string;
  label: string;
  category: TagCategory;
  patterns: RegExp[];
}

export const TAG_RULES: TagRule[] = [
  {
    id: "marketplace",
    label: "Marketplace",
    category: "product",
    patterns: [
      MARKETPLACE_PATTERN,
      C2C_MARKETPLACE_PATTERN,
      /plataforma\s+de\s+venta/i,
      /comprar\s+y\s+vender/i,
    ],
  },
  { id: "c2c", label: "C2C", category: "business", patterns: [C2C_MARKETPLACE_PATTERN, /\bc2c\b/i] },
  {
    id: "saas",
    label: "SaaS",
    category: "product",
    patterns: [/\bsaas\b|software\s+como\s+servicio/i],
  },
  { id: "crm", label: "CRM", category: "product", patterns: [/crm|gestión\s+de\s+clientes|relación\s+con\s+clientes/i] },
  { id: "erp", label: "ERP", category: "product", patterns: [/erp|planificación\s+de\s+recursos|gestión\s+empresarial/i] },
  { id: "b2b", label: "B2B", category: "business", patterns: [/b2b|empresas|negocios|pymes|constructoras|clínicas|gestorías/i] },
  { id: "b2c", label: "B2C", category: "business", patterns: [/b2c|consumidores|usuarios|familias|personas|particulares/i] },
  { id: "freemium", label: "Freemium", category: "model", patterns: [/freemium|gratis.*premium|plan\s+gratuito/i] },
  {
    id: "subscription",
    label: "Suscripción",
    category: "model",
    patterns: [/suscripción|mensual|recurrente|subscription/i],
  },
  { id: "ai", label: "IA", category: "tech", patterns: [/ia\b|inteligencia\s+artificial|machine\s+learning|chatgpt|copiloto/i] },
  { id: "mobile", label: "Mobile", category: "tech", patterns: [/móvil|mobile|app\s+nativa|ios|android|\bapp\b/i] },
  { id: "web", label: "Web", category: "tech", patterns: [/web|navegador|plataforma\s+online|plataforma/i] },
  { id: "api", label: "API", category: "tech", patterns: [/\bapi\b|integración|webhook|developer/i] },
  { id: "dashboard", label: "Dashboard", category: "product", patterns: [/dashboard|panel|métricas|analytics|informes/i] },
];

export const IDEA_PATTERNS = {
  marketplace: MARKETPLACE_PATTERN,
  c2c: C2C_MARKETPLACE_PATTERN,
  b2b: /empresas|constructoras|clínicas|pymes|b2b|negocios/i,
  padel: /pádel|padel|pista/i,
  food: /alimentario|comida|receta|caducidad|desperdicio/i,
  publicAid: /ayuda|subvención|pública|administración/i,
};

function ensureTag(found: DetectedTag[], tag: DetectedTag): void {
  if (!found.some((t) => t.id === tag.id)) found.push(tag);
}

export function detectTags(text: string): DetectedTag[] {
  const found: DetectedTag[] = [];
  const marketplace = isMarketplaceIdea(text);
  const c2c = isC2CMarketplaceIdea(text);

  for (const rule of TAG_RULES) {
    if (rule.id === "saas" && marketplace) continue;
    if (rule.patterns.some((p) => p.test(text))) {
      ensureTag(found, { id: rule.id, label: rule.label, category: rule.category });
    }
  }

  if (marketplace) {
    ensureTag(found, { id: "marketplace", label: "Marketplace", category: "product" });
    ensureTag(found, { id: "web", label: "Web", category: "tech" });
    if (c2c) {
      ensureTag(found, { id: "c2c", label: "C2C", category: "business" });
      ensureTag(found, { id: "b2c", label: "B2C", category: "business" });
      ensureTag(found, { id: "mobile", label: "Mobile", category: "tech" });
    }
  }

  if (found.length === 0 && text.length > 10 && !marketplace) {
    found.push({ id: "saas", label: "SaaS", category: "product" });
  }

  return found;
}

export function inferCategory(tags: DetectedTag[]): string {
  if (tags.some((t) => t.id === "marketplace" || t.id === "c2c")) return "marketplace";
  if (tags.some((t) => t.id === "erp")) return "saas";
  if (tags.some((t) => t.id === "crm")) return "saas";
  if (tags.some((t) => t.id === "dashboard")) return "dashboard";
  return "saas";
}

export function inferAudience(tags: DetectedTag[], text: string): string {
  if (tags.some((t) => t.id === "c2c")) return "Particulares compradores y vendedores";
  if (tags.some((t) => t.id === "marketplace") && tags.some((t) => t.id === "b2c")) {
    return "Consumidores y proveedores en la plataforma";
  }
  if (tags.some((t) => t.id === "b2b")) {
    if (/constructora/i.test(text)) return "Constructoras y promotoras";
    if (/clínica|dental/i.test(text)) return "Clínicas y centros sanitarios";
    if (/gestoría/i.test(text)) return "Gestorías y asesorías";
    return "Empresas y equipos B2B";
  }
  if (/cuidador/i.test(text)) return "Familias y cuidadores";
  if (/familia/i.test(text)) return "Familias";
  return "Consumidores digitales";
}

export function extractProjectName(text: string): string {
  const match = text.match(
    /(?:crear|construir|hacer)\s+(?:una?\s+)?(?:app|plataforma|saas|marketplace|erp|crm)?\s*(?:para|de)?\s*(.+?)(?:\.|$)/i
  );
  if (match) {
    const name = match[1].trim();
    return name.charAt(0).toUpperCase() + name.slice(0, 60);
  }
  const words = text.trim().split(/\s+/).slice(0, 4).join(" ");
  return words.charAt(0).toUpperCase() + words.slice(0, 50);
}

export function hashScore(text: string, seed: number): number {
  let h = seed;
  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) % 100;
  return h;
}

export function classifyIdea(text: string) {
  const lower = text.toLowerCase();
  return {
    isMarketplace: isMarketplaceIdea(text) || IDEA_PATTERNS.marketplace.test(lower),
    isC2C: isC2CMarketplaceIdea(text) || IDEA_PATTERNS.c2c.test(lower),
    isB2B: IDEA_PATTERNS.b2b.test(lower),
    isPadel: IDEA_PATTERNS.padel.test(lower),
    isFood: IDEA_PATTERNS.food.test(lower),
    isPublicAid: IDEA_PATTERNS.publicAid.test(lower),
  };
}
