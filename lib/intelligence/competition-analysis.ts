import type { CompetitionAnalysisOutput, DetectedTag } from "./types";
import { classifyIdea } from "./heuristics";

export function analyzeCompetition(text: string, tags: DetectedTag[]): CompetitionAnalysisOutput {
  const { isMarketplace, isPadel, isPublicAid } = classifyIdea(text);
  const sector = tags.map((t) => t.label).join(", ") || "General";

  if (isPadel && isMarketplace) {
    return {
      landscape: "Mercado de pádel en expansión con apps de reservas consolidadas",
      incumbents: ["Playtomic", "Reservas directas de clubes", "Apps locales regionales"],
      windowOfOpportunity: "Nichos B2B (gestión de clubes, entrenadores) con menor competencia directa",
      differentiationAngle: "SaaS vertical o marketplace de entrenadores, no reservas genéricas",
    };
  }

  if (isPublicAid) {
    return {
      landscape: "Sector fragmentado con soluciones parciales y datos desactualizados",
      incumbents: ["Portales gubernamentales", "Gestorías tradicionales", "Startups puntuales por autonomía"],
      windowOfOpportunity: "B2B para gestorías con datos verificados y alertas automáticas",
      differentiationAngle: "Copiloto profesional, no consumidor final",
    };
  }

  if (isMarketplace) {
    return {
      landscape: `Marketplace en sector: ${sector}. Alta barrera de efecto red.`,
      incumbents: ["Player global con funding", "2-3 startups locales seed", "Soluciones offline (WhatsApp, Excel)"],
      windowOfOpportunity: "Wedge vertical: un barrio, un sector, un tipo de usuario",
      differentiationAngle: "SaaS para supply-side + marketplace encima",
    };
  }

  return {
    landscape: `Sector ${sector} con competencia variable según nicho`,
    incumbents: ["Incumbente global", "Startups locales", "Herramientas genéricas (Notion, Excel)"],
    windowOfOpportunity: "Especialización vertical y UX superior en un job concreto",
    differentiationAngle: "Un único job-to-be-done ejecutado 10x mejor",
  };
}
