/** PROGRAM 5390 — Output selector by intent (SaaS, restaurant, corporate, mobile). */

import type { IntentionType } from "@/lib/mission-control/types";
import type { IntentProfile, MultiOutputKind, OutputRequirement } from "./types";

export interface OutputSelection {
  kind: MultiOutputKind;
  requirement: OutputRequirement;
  reason: string;
}

export interface SelectionResult {
  profile: IntentProfile;
  selections: OutputSelection[];
  explanation: string;
  excluded: Partial<Record<MultiOutputKind, string>>;
}

const SAAS_OUTPUTS: OutputSelection[] = [
  { kind: "VENTURE", requirement: "required", reason: "DNA de empresa y PRD" },
  { kind: "BRAND", requirement: "required", reason: "Identidad visual y design tokens" },
  { kind: "WEBSITE", requirement: "required", reason: "Landing y pricing público" },
  { kind: "WEB_APP", requirement: "required", reason: "Producto SaaS principal" },
  { kind: "BACKEND", requirement: "required", reason: "API y lógica de negocio" },
  { kind: "DATABASE", requirement: "required", reason: "Esquema multi-tenant" },
  { kind: "API", requirement: "required", reason: "Contratos compartidos web/mobile" },
  { kind: "DEPLOYMENT", requirement: "required", reason: "Preview deploy (sin producción)" },
  { kind: "GTM", requirement: "required", reason: "Plan de lanzamiento" },
  { kind: "INVESTOR", requirement: "required", reason: "Deck y modelo financiero" },
  { kind: "MOBILE", requirement: "optional", reason: "App móvil si hay usuarios de campo" },
  { kind: "OPERATIONAL", requirement: "optional", reason: "Playbooks post-lanzamiento" },
];

const RESTAURANT_OUTPUTS: OutputSelection[] = [
  { kind: "VENTURE", requirement: "required", reason: "Concepto y modelo de negocio" },
  { kind: "BRAND", requirement: "required", reason: "Identidad del local" },
  { kind: "WEBSITE", requirement: "required", reason: "Web con menú y reservas" },
  { kind: "WEB_APP", requirement: "optional", reason: "Sistema de reservas avanzado" },
  { kind: "MOBILE", requirement: "excluded", reason: "No prioritario para restaurante local" },
  { kind: "BACKEND", requirement: "optional", reason: "Backend solo si reservas online" },
  { kind: "DATABASE", requirement: "optional", reason: "Datos de reservas" },
  { kind: "API", requirement: "excluded", reason: "Sin API pública necesaria" },
  { kind: "DEPLOYMENT", requirement: "optional", reason: "Preview web" },
  { kind: "GTM", requirement: "optional", reason: "Marketing local" },
  { kind: "INVESTOR", requirement: "excluded", reason: "No busca inversión típicamente" },
  { kind: "OPERATIONAL", requirement: "optional", reason: "Procesos de servicio" },
];

const CORPORATE_OUTPUTS: OutputSelection[] = [
  { kind: "VENTURE", requirement: "optional", reason: "Perfil corporativo ligero" },
  { kind: "BRAND", requirement: "required", reason: "Manual de marca" },
  { kind: "WEBSITE", requirement: "required", reason: "Web corporativa + SEO" },
  { kind: "WEB_APP", requirement: "excluded", reason: "Sin producto SaaS" },
  { kind: "MOBILE", requirement: "excluded", reason: "Sin app móvil" },
  { kind: "BACKEND", requirement: "excluded", reason: "Sitio estático/marketing" },
  { kind: "DATABASE", requirement: "excluded", reason: "Sin backend" },
  { kind: "API", requirement: "excluded", reason: "Sin API" },
  { kind: "DEPLOYMENT", requirement: "required", reason: "Preview web" },
  { kind: "GTM", requirement: "optional", reason: "SEO y contenido" },
  { kind: "INVESTOR", requirement: "excluded", reason: "No aplica" },
  { kind: "OPERATIONAL", requirement: "excluded", reason: "No aplica" },
];

const MOBILE_OUTPUTS: OutputSelection[] = [
  { kind: "VENTURE", requirement: "required", reason: "PRD y roles de usuario" },
  { kind: "BRAND", requirement: "required", reason: "UI móvil coherente" },
  { kind: "WEBSITE", requirement: "required", reason: "Landing de descarga" },
  { kind: "MOBILE", requirement: "required", reason: "App móvil principal" },
  { kind: "BACKEND", requirement: "required", reason: "Servicios backend" },
  { kind: "DATABASE", requirement: "required", reason: "Persistencia" },
  { kind: "API", requirement: "required", reason: "Contratos mobile-first" },
  { kind: "WEB_APP", requirement: "optional", reason: "Panel admin web" },
  { kind: "DEPLOYMENT", requirement: "required", reason: "Preview Expo + API" },
  { kind: "GTM", requirement: "optional", reason: "App Store strategy" },
  { kind: "INVESTOR", requirement: "optional", reason: "Si busca funding" },
  { kind: "OPERATIONAL", requirement: "optional", reason: "Soporte post-launch" },
];

function detectPattern(ideaText: string, primary: IntentionType | null): IntentProfile["pattern"] {
  const lower = ideaText.toLowerCase();
  if (/restaurante|bar|catering|comida|menú|reserva/.test(lower)) return "restaurant";
  if (/corporativ|empresa web|seo|institucional|consultora/.test(lower)) return "corporate_web";
  if (/móvil|mobile|app store|expo|ios|android/.test(lower) || primary === "MOBILE") return "mobile_app";
  if (/saas|suscripción|plataforma|b2b|software/.test(lower) || primary === "APPLICATION") return "saas";
  if (primary === "VENTURE") return "venture";
  return "generic";
}

function extractKeywords(ideaText: string): string[] {
  const words = ideaText.toLowerCase().match(/\b[a-záéíóúñ]{4,}\b/g) ?? [];
  return [...new Set(words)].slice(0, 8);
}

function selectByPattern(pattern: IntentProfile["pattern"]): OutputSelection[] {
  switch (pattern) {
    case "restaurant":
      return RESTAURANT_OUTPUTS;
    case "corporate_web":
      return CORPORATE_OUTPUTS;
    case "mobile_app":
      return MOBILE_OUTPUTS;
    case "saas":
    case "venture":
    default:
      return SAAS_OUTPUTS;
  }
}

function buildExplanation(profile: IntentProfile, selections: OutputSelection[]): string {
  const required = selections.filter((s) => s.requirement === "required");
  const optional = selections.filter((s) => s.requirement === "optional");
  const excluded = selections.filter((s) => s.requirement === "excluded");

  const parts = [
    `Perfil detectado: ${profile.pattern}.`,
    `Se crearán ${required.length} entregables obligatorios`,
    optional.length > 0 ? `, ${optional.length} opcionales` : "",
    excluded.length > 0 ? ` y se excluyen ${excluded.length}` : "",
    ".",
  ];
  return parts.join("");
}

export function selectOutputsByIntent(
  ideaText: string,
  primary: IntentionType | null,
  secondary: IntentionType[] = []
): SelectionResult {
  const pattern = detectPattern(ideaText, primary);
  let selections = selectByPattern(pattern);

  // Override by explicit intention
  if (primary === "WEBSITE" && pattern === "generic") {
    selections = CORPORATE_OUTPUTS.map((s) =>
      s.kind === "WEBSITE" ? { ...s, requirement: "required" as const } : s
    );
  }
  if (primary === "MOBILE") {
    selections = MOBILE_OUTPUTS;
  }
  if (secondary.includes("MOBILE")) {
    selections = selections.map((s) =>
      s.kind === "MOBILE" ? { ...s, requirement: "required" as const } : s
    );
  }

  const profile: IntentProfile = {
    primary,
    secondary,
    ideaText,
    pattern,
    keywords: extractKeywords(ideaText),
  };

  const excluded: Partial<Record<MultiOutputKind, string>> = {};
  for (const s of selections) {
    if (s.requirement === "excluded") excluded[s.kind] = s.reason;
  }

  return {
    profile,
    selections,
    explanation: buildExplanation(profile, selections),
    excluded,
  };
}
