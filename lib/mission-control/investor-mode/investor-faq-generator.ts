/** PROGRAM 5800 — Investor FAQ generator. */

import type { FAQItem, VentureIntelligenceContext } from "./types";
import type { Mission } from "../types";

export function generateInvestorFAQ(mission: Mission, ctx: VentureIntelligenceContext): FAQItem[] {
  const name = ctx.ventureName;

  return [
    {
      id: "faq-why-now",
      category: "mercado",
      question: "¿Por qué ahora?",
      answer: `El sector de ${name} está en fase de digitalización acelerada. Ventana de oportunidad estimada en 24–36 meses con market score ${ctx.marketScore}/100.`,
    },
    {
      id: "faq-moat",
      category: "competencia",
      question: "¿Cuál es el moat?",
      answer: "Combinación de datos propietarios, integraciones verticales y velocidad de ejecución. Execution score actual: " + ctx.executionScore + "/100.",
    },
    {
      id: "faq-revenue",
      category: "finanzas",
      question: "¿Cómo generáis ingresos?",
      answer: "Modelo SaaS recurrente con margen bruto objetivo >75%. Setup fee enterprise complementario. Runway actual: " + Math.round(ctx.runwayMonths) + " meses.",
    },
    {
      id: "faq-burn",
      category: "finanzas",
      question: "¿Cuál es el burn rate?",
      answer: `Burn mensual estimado con runway de ${Math.round(ctx.runwayMonths)} meses. La ronda de ${(ctx.fundraisingEur / 1_000).toFixed(0)}K € extiende operaciones 18+ meses.`,
    },
    {
      id: "faq-team",
      category: "equipo",
      question: "¿Por qué este equipo?",
      answer: "Fundadores con experiencia sectorial y capacidad de ejecución demostrada en fase " + mission.phase + " de la misión.",
    },
    {
      id: "faq-round",
      category: "inversión",
      question: "¿Qué buscáis en la ronda?",
      answer: `Buscamos ${(ctx.fundraisingEur / 1_000).toFixed(0)}K € para equipo, GTM y producto. Valoración estimada: ${(ctx.valuationEur / 1_000_000).toFixed(1)} M€.`,
    },
    {
      id: "faq-use-funds",
      category: "inversión",
      question: "¿En qué se usarán los fondos?",
      answer: "40% equipo clave, 30% go-to-market, 20% producto/tecnología, 10% reserva operativa.",
    },
    {
      id: "faq-exit",
      category: "estrategia",
      question: "¿Cuál es la estrategia de salida?",
      answer: "Adquisición estratégica por player vertical o scale-up SaaS en horizonte 5–7 años. IPO no es objetivo a corto plazo.",
    },
    {
      id: "faq-risks",
      category: "riesgos",
      question: "¿Principales riesgos?",
      answer: "Riesgo de adopción en segmento enterprise, dependencia de contratación clave, y competencia de incumbentes. Mitigación vía pilotos y partnerships.",
    },
    {
      id: "faq-traction",
      category: "tracción",
      question: "¿Qué tracción tenéis?",
      answer: `Growth score ${ctx.growthScore}/100. Investor readiness Venture Intelligence: ${ctx.investorReadinessScore}%. ${ctx.executiveSummary.split("\n")[0]}`,
    },
  ];
}
