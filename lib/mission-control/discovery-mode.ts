/** Discovery mode — conversational opportunity exploration. */

import type { DiscoveryOpportunity, Mission } from "./types";

export interface DiscoveryQuestion {
  id: string;
  prompt: string;
  field: string;
}

export const DISCOVERY_QUESTIONS: DiscoveryQuestion[] = [
  { id: "knowledge", prompt: "¿Qué conocimientos o experiencia traes?", field: "knowledge" },
  { id: "capital", prompt: "¿Cuánto capital puedes invertir inicialmente?", field: "capital" },
  { id: "time", prompt: "¿Cuántas horas semanales puedes dedicar?", field: "time" },
  { id: "goals", prompt: "¿Cuál es tu objetivo principal en 12 meses?", field: "goals" },
  { id: "market", prompt: "¿Hay algún mercado o sector que te interese?", field: "market" },
  { id: "interests", prompt: "¿Qué problemas te gustaría resolver?", field: "interests" },
];

export function getNextDiscoveryQuestion(mission: Mission): DiscoveryQuestion | null {
  const profile = mission.discoveryProfile ?? {};
  return DISCOVERY_QUESTIONS.find((q) => !profile[q.field]) ?? null;
}

export function recordDiscoveryAnswer(mission: Mission, field: string, answer: string): Mission {
  return {
    ...mission,
    discoveryProfile: { ...(mission.discoveryProfile ?? {}), [field]: answer },
    updatedAt: new Date().toISOString(),
  };
}

export function isDiscoveryComplete(mission: Mission): boolean {
  const profile = mission.discoveryProfile ?? {};
  return DISCOVERY_QUESTIONS.every((q) => !!profile[q.field]);
}

export function generateOpportunities(mission: Mission): DiscoveryOpportunity[] {
  const profile = mission.discoveryProfile ?? {};
  const market = profile.market || "tecnología";
  const interests = profile.interests || "productividad";

  return [
    {
      id: "opp-1",
      title: `Plataforma SaaS de ${interests}`,
      ventureScore: 82,
      market: market,
      roi: "18-24 meses",
      mvpTime: "6-8 semanas",
      investment: profile.capital || "€5k-15k",
      scalability: "Alta — modelo recurrente",
      summary: "Aprovecha tu experiencia con un MVP enfocado en early adopters.",
    },
    {
      id: "opp-2",
      title: `Marketplace B2B en ${market}`,
      ventureScore: 74,
      market: market,
      roi: "24-36 meses",
      mvpTime: "10-12 semanas",
      investment: profile.capital || "€10k-25k",
      scalability: "Media-Alta — efecto red",
      summary: "Conecta proveedores y compradores con comisión por transacción.",
    },
    {
      id: "opp-3",
      title: "Servicio productizado con IA",
      ventureScore: 68,
      market: "servicios digitales",
      roi: "12-18 meses",
      mvpTime: "4-6 semanas",
      investment: profile.capital || "€2k-8k",
      scalability: "Media — automatizable",
      summary: "Empaqueta tu conocimiento en un servicio escalable con IA.",
    },
  ];
}

export function formatOpportunityList(opportunities: DiscoveryOpportunity[]): string {
  return opportunities
    .map(
      (o, i) =>
        `${i + 1}. **${o.title}** (Score ${o.ventureScore}) — ROI ${o.roi}, MVP ${o.mvpTime}, inversión ${o.investment}`
    )
    .join("\n");
}
