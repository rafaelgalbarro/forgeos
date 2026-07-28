/** Registry of 5 exit strategies with metadata. */

import type { ExitStrategyConfig, ExitStrategyType } from "./types";

export const EXIT_STRATEGIES: Record<ExitStrategyType, ExitStrategyConfig> = {
  venta: {
    type: "venta",
    label: "Sale / M&A",
    labelEs: "Venta",
    description: "Construir para adquisición estratégica o M&A. Prioriza tracción, IP y métricas de salida.",
    icon: "🏷️",
    timelineYears: "3–5 años",
    primaryKPIs: [
      { id: "arr", label: "ARR / ingresos recurrentes", target: "≥ €1M", weight: 0.25 },
      { id: "growth", label: "Crecimiento YoY", target: "≥ 80%", weight: 0.2 },
      { id: "retention", label: "Retención neta", target: "≥ 110%", weight: 0.2 },
      { id: "moat", label: "Ventaja competitiva", target: "Diferenciación clara", weight: 0.2 },
      { id: "dd", label: "Due diligence ready", target: "Data room completo", weight: 0.15 },
    ],
    risks: ["Dependencia del fundador", "Métricas infladas sin retención", "IP no documentada"],
    domainWeights: { roadmap: 0.8, finanzas: 0.9, marketing: 0.7, producto: 0.75 },
  },
  crecimiento_independiente: {
    type: "crecimiento_independiente",
    label: "Independent Growth",
    labelEs: "Crecimiento independiente",
    description: "Bootstrap o autofinanciación hasta escala. Prioriza rentabilidad unitaria y eficiencia.",
    icon: "📈",
    timelineYears: "5–10 años",
    primaryKPIs: [
      { id: "unit-econ", label: "Unit economics positivos", target: "LTV/CAC ≥ 3", weight: 0.3 },
      { id: "burn", label: "Burn rate controlado", target: "Runway ≥ 18 meses", weight: 0.25 },
      { id: "mrr", label: "MRR orgánico", target: "Crecimiento sostenido", weight: 0.25 },
      { id: "efficiency", label: "Eficiencia operativa", target: "Margen bruto ≥ 70%", weight: 0.2 },
    ],
    risks: ["Crecimiento lento vs competidores financiados", "Recursos limitados", "Fatiga del fundador"],
    domainWeights: { roadmap: 0.7, finanzas: 0.95, marketing: 0.6, producto: 0.8 },
  },
  dividendos: {
    type: "dividendos",
    label: "Dividend-focused",
    labelEs: "Dividendos",
    description: "Cash cow con flujo de caja estable. Prioriza márgenes, retención y distribución de beneficios.",
    icon: "💰",
    timelineYears: "Continuo",
    primaryKPIs: [
      { id: "margin", label: "Margen neto", target: "≥ 25%", weight: 0.3 },
      { id: "cashflow", label: "Flujo de caja libre", target: "Positivo y estable", weight: 0.3 },
      { id: "churn", label: "Churn bajo", target: "< 5% anual", weight: 0.2 },
      { id: "distribution", label: "Política de dividendos", target: "Definida y sostenible", weight: 0.2 },
    ],
    risks: ["Estancamiento de innovación", "Pérdida de talento", "Commoditización del producto"],
    domainWeights: { roadmap: 0.4, finanzas: 1.0, marketing: 0.5, producto: 0.5 },
  },
  venture_capital: {
    type: "venture_capital",
    label: "VC-backed Growth",
    labelEs: "Venture Capital",
    description: "Crecimiento acelerado con capital externo. Prioriza TAM, tracción y narrativa para inversores.",
    icon: "🚀",
    timelineYears: "7–10 años (IPO/M&A)",
    primaryKPIs: [
      { id: "tam", label: "TAM / mercado", target: "≥ €500M", weight: 0.2 },
      { id: "growth-rate", label: "Crecimiento MoM", target: "≥ 15%", weight: 0.25 },
      { id: "fundraising", label: "Fundraising readiness", target: "Deck + data room", weight: 0.2 },
      { id: "team", label: "Equipo escalable", target: "Roles clave cubiertos", weight: 0.15 },
      { id: "narrative", label: "Narrativa inversor", target: "Story clara", weight: 0.2 },
    ],
    risks: ["Dilución excesiva", "Presión de crecimiento", "Runway insuficiente entre rondas"],
    domainWeights: { roadmap: 0.85, finanzas: 0.9, marketing: 0.85, producto: 0.7 },
  },
  patrimonio_familiar: {
    type: "patrimonio_familiar",
    label: "Family Legacy",
    labelEs: "Patrimonio familiar",
    description: "Generational wealth y legado. Prioriza sostenibilidad, gobernanza y transferencia generacional.",
    icon: "🏛️",
    timelineYears: "Generacional",
    primaryKPIs: [
      { id: "governance", label: "Gobernanza", target: "Estructura definida", weight: 0.25 },
      { id: "succession", label: "Plan de sucesión", target: "Documentado", weight: 0.25 },
      { id: "stability", label: "Estabilidad financiera", target: "Reservas ≥ 12 meses", weight: 0.25 },
      { id: "brand", label: "Marca duradera", target: "Reputación sólida", weight: 0.25 },
    ],
    risks: ["Conflictos familiares", "Falta de profesionalización", "Resistencia al cambio"],
    domainWeights: { roadmap: 0.5, finanzas: 0.8, marketing: 0.6, producto: 0.55 },
  },
};

export const EXIT_STRATEGY_ORDER: ExitStrategyType[] = [
  "venta",
  "crecimiento_independiente",
  "dividendos",
  "venture_capital",
  "patrimonio_familiar",
];

export function getExitStrategyConfig(type: ExitStrategyType): ExitStrategyConfig {
  return EXIT_STRATEGIES[type];
}

export function getExitStrategyLabel(type: ExitStrategyType): string {
  return EXIT_STRATEGIES[type].labelEs;
}
