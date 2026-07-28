/** Generate adaptation plans for Roadmap/Finanzas/Marketing/Producto per strategy. */

import type { AdaptationPlan, AdaptationRecommendation, ExitStrategyType } from "./types";
import { getExitStrategyConfig } from "./exit-strategy-registry";

function roadmapAdaptations(type: ExitStrategyType): AdaptationRecommendation[] {
  const base: Record<ExitStrategyType, AdaptationRecommendation[]> = {
    venta: [
      { domain: "roadmap", label: "Roadmap", priority: "high", action: "Acelerar hitos de tracción y métricas de salida", rationale: "Compradores valoran ARR, retención y moat demostrable en 3–5 años." },
      { domain: "roadmap", label: "Roadmap", priority: "medium", action: "Documentar IP y diferenciación en milestones", rationale: "Due diligence requiere trazabilidad de activos intangibles." },
    ],
    crecimiento_independiente: [
      { domain: "roadmap", label: "Roadmap", priority: "high", action: "Priorizar features con ROI directo", rationale: "Sin capital externo, cada sprint debe acercar a rentabilidad." },
      { domain: "roadmap", label: "Roadmap", priority: "medium", action: "Timeline conservador con hitos de unit economics", rationale: "Runway limitado exige validación incremental." },
    ],
    dividendos: [
      { domain: "roadmap", label: "Roadmap", priority: "low", action: "Roadmap de mantenimiento y optimización", rationale: "Innovación disruptiva no es prioritaria; estabilidad sí." },
      { domain: "roadmap", label: "Roadmap", priority: "medium", action: "Features que reducen churn y costes operativos", rationale: "Cash cow requiere retención y márgenes, no crecimiento agresivo." },
    ],
    venture_capital: [
      { domain: "roadmap", label: "Roadmap", priority: "high", action: "Hitos de crecimiento MoM y expansión de mercado", rationale: "Inversores miden velocidad de tracción y TAM capturado." },
      { domain: "roadmap", label: "Roadmap", priority: "high", action: "Milestones alineados con rondas de financiación", rationale: "Cada ronda requiere narrativa de progreso clara." },
    ],
    patrimonio_familiar: [
      { domain: "roadmap", label: "Roadmap", priority: "medium", action: "Plan a largo plazo con gobernanza y sucesión", rationale: "Legado generacional requiere estabilidad y continuidad." },
      { domain: "roadmap", label: "Roadmap", priority: "low", action: "Innovación incremental sin riesgo existencial", rationale: "Preservar valor del patrimonio sobre disrupción." },
    ],
  };
  return base[type];
}

function finanzasAdaptations(type: ExitStrategyType): AdaptationRecommendation[] {
  const base: Record<ExitStrategyType, AdaptationRecommendation[]> = {
    venta: [
      { domain: "finanzas", label: "Finanzas", priority: "high", action: "Modelo con proyección de ARR y múltiplos de salida", rationale: "Valoración M&A depende de métricas SaaS estándar." },
      { domain: "finanzas", label: "Finanzas", priority: "medium", action: "Preparar data room financiero", rationale: "Due diligence financiero es gate crítico en venta." },
    ],
    crecimiento_independiente: [
      { domain: "finanzas", label: "Finanzas", priority: "high", action: "Enfoque en unit economics y burn rate", rationale: "Autofinanciación exige LTV/CAC positivo y runway largo." },
      { domain: "finanzas", label: "Finanzas", priority: "high", action: "Proyecciones conservadoras sin dilución", rationale: "No hay buffer de capital externo para errores." },
    ],
    dividendos: [
      { domain: "finanzas", label: "Finanzas", priority: "high", action: "Modelo de flujo de caja y política de dividendos", rationale: "Distribución sostenible requiere márgenes predecibles." },
      { domain: "finanzas", label: "Finanzas", priority: "medium", action: "Reservas y colchón de liquidez", rationale: "Estabilidad financiera ante variaciones de mercado." },
    ],
    venture_capital: [
      { domain: "finanzas", label: "Finanzas", priority: "high", action: "Modelo de fundraising y use of funds", rationale: "VC requiere narrativa de capital deployment clara." },
      { domain: "finanzas", label: "Finanzas", priority: "high", action: "Proyecciones de crecimiento agresivo con burn planificado", rationale: "Inversores esperan reinversión en growth sobre profit." },
    ],
    patrimonio_familiar: [
      { domain: "finanzas", label: "Finanzas", priority: "high", action: "Estructura patrimonial y reservas generacionales", rationale: "Wealth preservation sobre maximización de valoración." },
      { domain: "finanzas", label: "Finanzas", priority: "medium", action: "Plan fiscal y de sucesión", rationale: "Transferencia generacional requiere planificación." },
    ],
  };
  return base[type];
}

function marketingAdaptations(type: ExitStrategyType): AdaptationRecommendation[] {
  const base: Record<ExitStrategyType, AdaptationRecommendation[]> = {
    venta: [
      { domain: "marketing", label: "Marketing", priority: "medium", action: "Brand positioning para adquirentes estratégicos", rationale: "Visibilidad ante potenciales compradores del sector." },
      { domain: "marketing", label: "Marketing", priority: "high", action: "GTM orientado a tracción medible", rationale: "Métricas de adquisición y retención son KPIs de salida." },
    ],
    crecimiento_independiente: [
      { domain: "marketing", label: "Marketing", priority: "medium", action: "GTM lean con CAC controlado", rationale: "Cada euro de marketing debe retornar en < 12 meses." },
      { domain: "marketing", label: "Marketing", priority: "low", action: "Brand orgánico sobre paid agresivo", rationale: "Presupuesto limitado favorece contenido y referrals." },
    ],
    dividendos: [
      { domain: "marketing", label: "Marketing", priority: "low", action: "Retención y upsell sobre adquisición", rationale: "Base instalada es la fuente principal de ingresos." },
      { domain: "marketing", label: "Marketing", priority: "medium", action: "Comunicación de estabilidad y confianza", rationale: "Clientes de cash cow valoran predictibilidad." },
    ],
    venture_capital: [
      { domain: "marketing", label: "Marketing", priority: "high", action: "GTM agresivo y visibilidad inversor", rationale: "VC valora market share y narrativa de mercado." },
      { domain: "marketing", label: "Marketing", priority: "high", action: "PR, thought leadership y presencia en eventos", rationale: "Investor visibility acelera fundraising." },
    ],
    patrimonio_familiar: [
      { domain: "marketing", label: "Marketing", priority: "medium", action: "Brand legacy y reputación a largo plazo", rationale: "Marca duradera es activo generacional." },
      { domain: "marketing", label: "Marketing", priority: "low", action: "Relaciones locales y confianza comunitaria", rationale: "Patrimonio familiar suele anclarse en comunidad." },
    ],
  };
  return base[type];
}

function productoAdaptations(type: ExitStrategyType): AdaptationRecommendation[] {
  const base: Record<ExitStrategyType, AdaptationRecommendation[]> = {
    venta: [
      { domain: "producto", label: "Producto", priority: "high", action: "Features que demuestran moat y retención", rationale: "Adquirentes pagan premium por lock-in y datos." },
      { domain: "producto", label: "Producto", priority: "medium", action: "Integraciones estratégicas del sector", rationale: "Ecosistema compatible aumenta valor de salida." },
    ],
    crecimiento_independiente: [
      { domain: "producto", label: "Producto", priority: "high", action: "MVP rápido con scope acotado", rationale: "Validar antes de invertir en enterprise features." },
      { domain: "producto", label: "Producto", priority: "medium", action: "Automatización para reducir costes operativos", rationale: "Eficiencia es clave sin capital externo." },
    ],
    dividendos: [
      { domain: "producto", label: "Producto", priority: "low", action: "Mantenimiento y estabilidad sobre nuevas features", rationale: "Disrupción innecesaria arriesga flujo de caja." },
      { domain: "producto", label: "Producto", priority: "medium", action: "Optimización de pricing y packaging", rationale: "Maximizar ARPU de base existente." },
    ],
    venture_capital: [
      { domain: "producto", label: "Producto", priority: "high", action: "Platform play con network effects", rationale: "VC busca escalabilidad y winner-takes-most." },
      { domain: "producto", label: "Producto", priority: "medium", action: "Enterprise features para ACV alto", rationale: "Contratos grandes aceleran métricas de fundraising." },
    ],
    patrimonio_familiar: [
      { domain: "producto", label: "Producto", priority: "medium", action: "Producto estable con bajo churn técnico", rationale: "Continuidad operativa para próxima generación." },
      { domain: "producto", label: "Producto", priority: "low", action: "Documentación y transferencia de conocimiento", rationale: "Sucesión requiere producto comprensible." },
    ],
  };
  return base[type];
}

function snapshotAdjustments(type: ExitStrategyType): AdaptationPlan["snapshotAdjustments"] {
  const config = getExitStrategyConfig(type);
  const weights = config.domainWeights;
  return [
    { domain: "financials", progressDelta: Math.round(weights.finanzas * 15), summary: `Énfasis financiero para ${config.labelEs}` },
    { domain: "marketing", progressDelta: Math.round(weights.marketing * 12), summary: `GTM adaptado a ${config.labelEs}` },
    { domain: "investorReadiness", progressDelta: type === "venture_capital" || type === "venta" ? 20 : type === "dividendos" ? -10 : 5, summary: "Investor readiness ajustado" },
    { domain: "prd", progressDelta: Math.round(weights.producto * 10), summary: `Scope producto para ${config.labelEs}` },
  ];
}

export function generateAdaptationPlan(strategy: ExitStrategyType): AdaptationPlan {
  const recommendations = [
    ...roadmapAdaptations(strategy),
    ...finanzasAdaptations(strategy),
    ...marketingAdaptations(strategy),
    ...productoAdaptations(strategy),
  ];

  return {
    strategy,
    recommendations,
    snapshotAdjustments: snapshotAdjustments(strategy),
    generatedAt: new Date().toISOString(),
  };
}

export function adaptationDomainsChanged(
  prev: ExitStrategyType | null,
  next: ExitStrategyType
): import("./types").AdaptationDomain[] {
  if (!prev) return ["roadmap", "finanzas", "marketing", "producto"];
  const prevPlan = generateAdaptationPlan(prev);
  const nextPlan = generateAdaptationPlan(next);
  const domains: import("./types").AdaptationDomain[] = [];
  for (const domain of ["roadmap", "finanzas", "marketing", "producto"] as const) {
    const prevActions = prevPlan.recommendations.filter((r) => r.domain === domain).map((r) => r.action).join();
    const nextActions = nextPlan.recommendations.filter((r) => r.domain === domain).map((r) => r.action).join();
    if (prevActions !== nextActions) domains.push(domain);
  }
  return domains;
}
