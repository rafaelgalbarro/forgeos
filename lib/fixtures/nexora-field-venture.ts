/**
 * NEXORA FIELD — Program 5150 E2E validation fixture (generic, no pipeline hardcoding).
 * Field service management for maintenance companies.
 */

import type { VentureProject, VentureSection } from "@/lib/domain/venture";
import type { ForgeIntelligenceReport } from "@/lib/intelligence/types";
import type { ProductPRD } from "@/lib/ai/types/product";
import type { ResearchReport } from "@/lib/ai/types/research";
import { runVentureSimulator } from "@/lib/venture-simulator";
import { mapFounderAdvisorReport } from "@/lib/domain/founder-advisor";

export const NEXORA_FIELD_VENTURE_ID = "demo-venture-nexora-field";
export const NEXORA_FIELD_ALIAS = "nexora-field";

export const NEXORA_FIELD_IDEA =
  "Plataforma para gestionar técnicos, incidencias, rutas, inventario y facturación en empresas de mantenimiento.";

const now = "2026-07-14T08:00:00.000Z";

const intelligenceReport: ForgeIntelligenceReport = {
  ideaText: NEXORA_FIELD_IDEA,
  projectName: "NEXORA FIELD",
  category: "saas",
  targetAudience: "Empresas de mantenimiento industrial y facility B2B en España",
  tags: [
    { id: "t1", label: "Field Service", category: "product" },
    { id: "t2", label: "B2B SaaS", category: "business" },
    { id: "t3", label: "Maintenance", category: "business" },
  ],
  startupScore: 76,
  risks: [
    { title: "Adopción técnicos", description: "Resistencia a app móvil en campo", severity: "media" },
    { title: "Integración ERP", description: "Facturación legacy heterogénea", severity: "media" },
  ],
  opportunities: [
    { title: "Digitalización FM", description: "PYMEs mantenimiento infra-digitalizadas", probability: "alta" },
    { title: "Rutas optimizadas", description: "Ahorro combustible y tiempo 20%+", probability: "alta" },
  ],
  recommendedBusinessModel: "Suscripción por técnico activo + módulos inventario/facturación",
  technicalComplexity: "Media",
  estimatedMvpTime: "8-10 semanas",
  estimatedDevelopmentCost: "€32k-€48k",
  launchPriority: "alta",
  founderAdvisor: {
    headline: "Oportunidad clara en field service para mantenimiento B2B",
    summary: "Las empresas de mantenimiento usan WhatsApp y Excel. NEXORA unifica operaciones con ROI medible en rutas y SLA.",
    stance: "proceed",
    risks: [{ title: "Churn SMB", description: "Sensibilidad precio en PYMEs", severity: "media" }],
    opportunities: [{ title: "Vertical HVAC", description: "Especialización por vertical", probability: "media" }],
    alternatives: [{ title: "MVP solo incidencias+rutas", description: "Sin facturación en v1", rationale: "Acelera time-to-value" }],
    recommendations: [
      { text: "Piloto con 1 empresa 10-30 técnicos", reason: "Validar adopción campo" },
      { text: "Pricing por técnico/mes", reason: "Alineado con valor operativo" },
    ],
    questions: ["¿Facturación integrada obligatoria en MVP?", "¿GPS en tiempo real o check-in manual?"],
    shouldCompare: true,
  },
  market: {
    tamEstimate: "€2.1B (field service management EU SMB)",
    growthTrend: "11% CAGR",
    competitionLevel: "Media",
    innovationLevel: "Media",
    successProbability: "70%",
    scalability: "Alta — multi-tenant SaaS",
  },
  competition: {
    landscape: "Incumbentes enterprise; hueco en PYMEs mantenimiento",
    incumbents: ["ServiceMax", "Praxedo", "Jobber", "Holded"],
    windowOfOpportunity: "18-24 meses",
    differentiationAngle: "Rutas + inventario + facturación unificados para mantenimiento español",
  },
  businessModel: {
    recommended: "SaaS por técnico",
    alternatives: ["Por empresa flat", "Revenue share partners"],
    revenueMechanism: "MRR por técnico + add-ons",
    reasoning: "Valor percibido por productividad de campo",
  },
  generatedAt: now,
  source: "heuristic",
};

const researchReport: ResearchReport = {
  marketSummary:
    "El mercado de gestión de servicios de campo en mantenimiento crece impulsado por digitalización de PYMEs y presión de SLA. España tiene miles de empresas de 5-50 técnicos sin software unificado.",
  targetSegments: ["Empresas mantenimiento industrial", "Facility SMB", "HVAC y electricidad"],
  competitors: [
    { name: "Praxedo", type: "FSM enterprise", strengths: ["Maduro", "Campo"], weaknesses: ["Precio alto SMB", "UX compleja"] },
    { name: "Jobber", type: "SMB FSM", strengths: ["Simple", "Precio"], weaknesses: ["Menos inventario", "US-centric"] },
  ],
  marketRisks: ["Competencia precio", "Adopción móvil"],
  opportunities: ["Verticalización HVAC", "Integración contabilidad española"],
  differentiationAngles: ["Rutas + inventario + facturación", "SLA medible", "Onboarding rápido"],
  validationPlan: ["6 entrevistas gerentes mantenimiento", "POC 2 semanas con 5 técnicos"],
  recommendedNextQuestions: ["Integración facturación obligatoria", "Offline móvil requerido"],
};

const productPRD: ProductPRD = {
  executiveSummary: "NEXORA FIELD unifica gestión de técnicos, incidencias, rutas, inventario y facturación para empresas de mantenimiento.",
  problemStatement: "Operaciones fragmentadas en WhatsApp, Excel y ERP desconectado sin visibilidad de rutas ni SLA.",
  targetCustomer: "Gerente operaciones con 5-50 técnicos",
  valueProposition: "Reduce tiempo de resolución 30% y optimiza rutas diarias",
  mvpScope: [
    "Gestión técnicos y turnos",
    "Ticketing incidencias con SLA",
    "Planificación rutas diarias",
    "Inventario básico por almacén",
    "Facturación simple vinculada a órdenes",
  ],
  v2Features: ["App móvil offline", "Integración ERP", "Analytics predictivo"],
  userStories: [
    "Como gerente quiero ver incidencias abiertas por técnico y SLA",
    "Como técnico quiero mi ruta optimizada del día en móvil",
    "Como admin quiero facturar órdenes cerradas automáticamente",
  ],
  mainScreens: ["Dashboard operaciones", "Mapa rutas", "Cola incidencias", "Inventario", "Facturación"],
  coreFlows: ["Crear incidencia", "Asignar técnico", "Optimizar ruta", "Cerrar y facturar"],
  assumptions: ["Conectividad 4G en zona urbana", "Técnicos con smartphone"],
  risks: ["Adopción campo", "Datos inventario incompletos"],
  successMetrics: ["MTTR < 6h", "Rutas optimizadas > 80%", "Facturación < 24h post-cierre"],
  roadmap30_60_90: {
    day30: ["MVP incidencias + técnicos", "1 piloto"],
    day60: ["Rutas + inventario", "Facturación básica"],
    day90: ["App móvil PWA", "Integración contabilidad"],
  },
};

function buildSections(): VentureSection[] {
  return [
    { id: "resumen", title: "Resumen", content: productPRD.executiveSummary, format: "markdown" },
    { id: "mercado", title: "Mercado", content: researchReport.marketSummary, format: "markdown" },
    { id: "prd", title: "Producto", content: productPRD.problemStatement, format: "markdown" },
    { id: "arquitectura", title: "Arquitectura", content: "Next.js + PostgreSQL multi-tenant. API REST. PWA técnicos. Sin deploy productivo en validación.", format: "markdown" },
    { id: "kpis", title: "KPIs", content: "MTTR, SLA, rutas/día, MRR, churn, NPS técnicos.", format: "markdown" },
  ];
}

function createNexoraVenture(): VentureProject {
  const venture: VentureProject = {
    id: NEXORA_FIELD_VENTURE_ID,
    ideaText: NEXORA_FIELD_IDEA,
    name: "NEXORA FIELD",
    description: NEXORA_FIELD_IDEA,
    category: "saas",
    targetAudience: intelligenceReport.targetAudience,
    status: "ready",
    createdAt: now,
    updatedAt: now,
    intelligenceReport,
    intelligenceAccepted: true,
    analysis: {
      tags: intelligenceReport.tags,
      market: {
        mercadoEstimado: intelligenceReport.market.tamEstimate,
        competencia: intelligenceReport.market.competitionLevel,
        nivelInnovacion: intelligenceReport.market.innovationLevel,
        complejidadTecnica: "Media-Alta",
        probabilidadExito: "70",
        tiempoMvp: intelligenceReport.estimatedMvpTime,
        costeDesarrollo: intelligenceReport.estimatedDevelopmentCost,
        modeloNegocio: intelligenceReport.recommendedBusinessModel,
        escalabilidad: intelligenceReport.market.scalability,
      },
      category: "saas",
      targetAudience: intelligenceReport.targetAudience,
      projectName: "NEXORA FIELD",
    },
    founderAdvisor: mapFounderAdvisorReport(intelligenceReport.founderAdvisor),
    researchReport,
    researchMeta: { source: "mock", usedKnowledgeRefs: [], fallbackUsed: false },
    productPRD,
    productPRDSource: "mock",
    productMeta: { source: "mock", usedResearch: true, usedKnowledgeRefs: [], fallbackUsed: false },
    discoveryContext: {
      clarifiedDecisions: ["B2B SaaS", "España", "Field service"],
      remainingQuestions: [],
      inferredProductType: "SaaS B2B",
      inferredBusinessModel: "Por técnico/mes",
      targetCustomerHints: ["Gerentes mantenimiento", "PYMEs 5-50 técnicos"],
      monetizationHints: ["Por técnico", "Add-ons inventario/facturación"],
      trustAndSafetyHints: ["GDPR", "SLA contractual"],
      platformHints: ["Web dashboard", "PWA técnicos"],
      buildConstraints: ["MVP 8-10 semanas", "Sin deploy productivo"],
      answers: [],
    },
    sections: buildSections(),
    ventureSimulatorResult: null,
  };

  venture.ventureSimulatorResult = runVentureSimulator({
    ideaText: venture.ideaText,
    intelligenceReport: venture.intelligenceReport,
    researchReport: venture.researchReport,
    discoveryContext: venture.discoveryContext,
    productPRD: venture.productPRD,
  });

  return venture;
}

export const NEXORA_FIELD_VENTURE: VentureProject = createNexoraVenture();

export function isNexoraFieldVentureId(id: string): boolean {
  return id === NEXORA_FIELD_VENTURE_ID || id === NEXORA_FIELD_ALIAS;
}
