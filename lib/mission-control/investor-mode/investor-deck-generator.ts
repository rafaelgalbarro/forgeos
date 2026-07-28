/** PROGRAM 5800 — Investor deck slide outline generator. */

import type { DeckSlide, VentureIntelligenceContext } from "./types";
import type { Mission } from "../types";

export function generateInvestorDeck(mission: Mission, ctx: VentureIntelligenceContext): DeckSlide[] {
  const name = ctx.ventureName;
  const idea = mission.idea || name;

  return [
    {
      id: "slide-cover",
      order: 1,
      title: name,
      bullets: ["Pitch deck inversor", `Fase misión: ${mission.phase}`, "Confidencial"],
      notes: "Portada con logo y tagline",
    },
    {
      id: "slide-problem",
      order: 2,
      title: "Problema",
      bullets: [
        `El mercado objetivo de ${idea} está infra-digitalizado`,
        "Dolor operativo medible en costes y tiempo",
        "Ventana de oportunidad 24–36 meses",
      ],
    },
    {
      id: "slide-solution",
      order: 3,
      title: "Solución",
      bullets: [
        `${name}: plataforma que resuelve el problema core`,
        "Propuesta de valor diferenciada vs. incumbentes",
        "MVP validado en fase actual de misión",
      ],
    },
    {
      id: "slide-market",
      order: 4,
      title: "Mercado",
      bullets: [
        `TAM estimado: mercado amplio en sector objetivo`,
        `Market score: ${ctx.marketScore}/100`,
        "Segmento inicial: early adopters enterprise/SMB",
      ],
    },
    {
      id: "slide-traction",
      order: 5,
      title: "Tracción",
      bullets: [
        `Growth score: ${ctx.growthScore}/100`,
        `Runway: ${Math.round(ctx.runwayMonths)} meses`,
        `Revenue en crecimiento — execution ${ctx.executionScore}/100`,
        ...(ctx.networkBenchmarks?.length ? [`Benchmark red: ${ctx.networkBenchmarks[0]}`] : []),
      ],
    },
    {
      id: "slide-business",
      order: 6,
      title: "Modelo de negocio",
      bullets: [
        "SaaS recurrente con margen bruto >75%",
        "Setup fee enterprise negociable",
        "Unit economics validados en piloto",
      ],
    },
    {
      id: "slide-team",
      order: 7,
      title: "Equipo",
      bullets: [
        "Fundadores con experiencia sectorial",
        "Advisory board en construcción",
        `Venture score: ${ctx.intelligenceScore}/100`,
      ],
    },
    {
      id: "slide-ask",
      order: 8,
      title: "The Ask",
      bullets: [
        `Ronda objetivo: ${(ctx.fundraisingEur / 1_000).toFixed(0)}K €`,
        `Valoración estimada: ${(ctx.valuationEur / 1_000_000).toFixed(1)} M€`,
        "Uso de fondos: equipo, GTM, producto, reserva",
      ],
      notes: "Incluir timeline de cierre y milestones",
    },
  ];
}
