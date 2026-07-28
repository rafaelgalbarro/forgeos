/**
 * AUREA FACILITIES — Program 10000 E2E venture fixture.
 * Facility management / premium services company (generic fixture data only).
 */

import type { VentureProject, VentureSection } from "@/lib/domain/venture";
import type { ForgeIntelligenceReport } from "@/lib/intelligence/types";
import type { ProductPRD } from "@/lib/ai/types/product";
import type { ResearchReport } from "@/lib/ai/types/research";
import { runVentureSimulator } from "@/lib/venture-simulator";
import { mapFounderAdvisorReport } from "@/lib/domain/founder-advisor";

export const AUREA_FACILITIES_VENTURE_ID = "demo-venture-aurea-facilities";
export const AUREA_FACILITIES_ALIAS = "aurea-facilities";

const IDEA_TEXT =
  "AUREA FACILITIES es una plataforma de gestión integral de instalaciones premium y servicios facility para edificios corporativos, hoteles y residencias de lujo, con operaciones, mantenimiento predictivo y experiencia del inquilino en un solo hub.";

const now = "2026-07-08T10:00:00.000Z";

const intelligenceReport: ForgeIntelligenceReport = {
  ideaText: IDEA_TEXT,
  projectName: "AUREA FACILITIES",
  category: "saas",
  targetAudience: "Property managers, facility directors y asset owners en España y Portugal",
  tags: [
    { id: "t1", label: "PropTech", category: "product" },
    { id: "t2", label: "Facility Management", category: "business" },
    { id: "t3", label: "Premium Services", category: "business" },
    { id: "t4", label: "B2B SaaS", category: "business" },
  ],
  startupScore: 78,
  risks: [
    { title: "Adopción operativa", description: "Resistencia de equipos de mantenimiento en campo", severity: "media" },
    { title: "Integración legacy", description: "Sistemas BMS y ERP heterogéneos", severity: "media" },
    { title: "SLA premium", description: "Expectativas altas en edificios de lujo", severity: "alta" },
  ],
  opportunities: [
    { title: "ESG reporting", description: "Demanda de métricas de sostenibilidad en activos premium", probability: "alta" },
    { title: "Hospitality upsell", description: "Cross-sell a cadenas hoteleras boutique", probability: "media" },
    { title: "Predictive maintenance", description: "Reducción de costes operativos 15-25%", probability: "alta" },
  ],
  recommendedBusinessModel: "Suscripción por activo + módulos premium (concierge, ESG, analytics)",
  technicalComplexity: "Media",
  estimatedMvpTime: "8-10 semanas",
  estimatedDevelopmentCost: "€38k-€55k",
  launchPriority: "alta",
  founderAdvisor: {
    headline: "Oportunidad sólida en facility premium con diferenciación por experiencia del inquilino",
    summary:
      "El segmento premium está infra-digitalizado. AUREA puede capturar valor unificando operaciones, mantenimiento y servicios concierge con SLAs medibles.",
    stance: "proceed",
    risks: [
      { title: "Time-to-value", description: "Onboarding de activos complejos", severity: "media" },
    ],
    opportunities: [
      { title: "Corporate campuses", description: "Demanda post-híbrido de espacios premium", probability: "alta" },
    ],
    alternatives: [
      { title: "MVP solo mantenimiento", description: "Sin módulo concierge en v1", rationale: "Acelera validación operativa" },
    ],
    recommendations: [
      { text: "Piloto con 2 edificios premium en Madrid", reason: "Validar SLA y NPS inquilino" },
      { text: "Definir pricing por m² y por módulo", reason: "Clarificar unit economics" },
    ],
    questions: ["¿Integración con BMS existente obligatoria en v1?", "¿Concierge humano o solo digital?"],
    shouldCompare: true,
  },
  market: {
    tamEstimate: "€4.8B (facility management premium EU)",
    growthTrend: "9% CAGR",
    competitionLevel: "Media",
    innovationLevel: "Media-Alta",
    successProbability: "72%",
    scalability: "Alta — multi-asset SaaS",
  },
  competition: {
    landscape: "Incumbentes FM tradicionales; pocos SaaS unificados para premium",
    incumbents: ["ISS", "Sodexo", "Planon", "Facilio"],
    windowOfOpportunity: "24-36 meses antes de consolidación PropTech",
    differentiationAngle: "Experiencia inquilino + mantenimiento predictivo + ESG nativo",
  },
  businessModel: {
    recommended: "SaaS por activo + módulos",
    alternatives: ["Per-seat operadores", "Revenue share con facility partners"],
    revenueMechanism: "MRR por edificio + add-ons concierge/ESG",
    reasoning: "Alineado con valor percibido por asset owner y property manager",
  },
  generatedAt: now,
  source: "heuristic",
};

const researchReport: ResearchReport = {
  marketSummary:
    "El mercado de facility management premium en Iberia crece impulsado por edificios corporativos clase A, hoteles boutique y residencias de lujo. La digitalización operativa y la experiencia del inquilino son drivers clave no cubiertos por soluciones legacy.",
  targetSegments: [
    "Property managers de edificios corporativos premium",
    "Facility directors en hoteles 4-5 estrellas",
    "Asset owners de residencias de lujo",
  ],
  competitors: [
    {
      name: "Planon",
      type: "IWMS enterprise",
      strengths: ["Suite completa", "Enterprise sales"],
      weaknesses: ["Implementación larga", "UX legacy", "Precio alto SMB"],
    },
    {
      name: "Facilio",
      type: "CMMS cloud",
      strengths: ["IoT integrations", "Modern stack"],
      weaknesses: ["Menos foco premium/concierge", "Mercado US-centric"],
    },
    {
      name: "ISS",
      type: "Operador FM tradicional",
      strengths: ["Escala operativa", "Relaciones enterprise"],
      weaknesses: ["Poca plataforma propia unificada", "Innovación lenta"],
    },
  ],
  marketRisks: ["Ciclos inmobiliarios", "Dependencia de partners de mantenimiento"],
  opportunities: ["Certificaciones ESG", "Smart building retrofits", "Hospitality recovery"],
  differentiationAngles: [
    "Hub único operaciones + concierge",
    "Mantenimiento predictivo con alertas SLA",
    "Portal inquilino premium white-label",
  ],
  validationPlan: [
    "8 entrevistas facility directors premium",
    "POC en 1 edificio corporativo piloto",
    "Benchmark pricing vs Planon/Facilio",
  ],
  recommendedNextQuestions: ["SLA aceptable para incidencias críticas", "Integración BMS requerida en MVP"],
};

const productPRD: ProductPRD = {
  executiveSummary:
    "AUREA FACILITIES unifica operaciones de facility, mantenimiento predictivo y servicios premium para inquilinos en una plataforma SaaS multi-activo.",
  problemStatement:
    "Los gestores de activos premium usan herramientas fragmentadas (CMMS, hojas de cálculo, WhatsApp) sin visibilidad unificada ni métricas de experiencia del inquilino.",
  targetCustomer: "Facility director con 1-20 activos premium",
  valueProposition: "Reduce incidencias no resueltas en 40% y mejora NPS inquilino con operaciones centralizadas",
  mvpScope: [
    "Onboarding multi-activo y zonas",
    "Ticketing incidencias con SLA",
    "Mantenimiento preventivo programado",
    "Dashboard operativo y alertas",
    "Portal inquilino básico (solicitudes)",
  ],
  v2Features: [
    "Módulo concierge premium",
    "Integración BMS/IoT",
    "Reporting ESG",
    "App móvil técnicos de campo",
  ],
  userStories: [
    "Como facility director quiero ver todas las incidencias abiertas por activo con SLA en tiempo real",
    "Como inquilino premium quiero solicitar servicios concierge desde mi móvil",
    "Como técnico quiero recibir órdenes de trabajo priorizadas en campo",
  ],
  mainScreens: [
    "Dashboard operativo",
    "Mapa de activos y zonas",
    "Cola de incidencias SLA",
    "Calendario mantenimiento",
    "Portal inquilino",
  ],
  coreFlows: [
    "Registrar incidencia",
    "Asignar técnico",
    "Cerrar con evidencia",
    "Programar mantenimiento preventivo",
  ],
  assumptions: ["Conectividad estable en activos", "Equipos operativos adoptan app móvil"],
  risks: ["Adopción en campo", "Datos BMS incompletos"],
  successMetrics: ["MTTR < 4h críticas", "SLA compliance > 95%", "NPS inquilino > 50", "Churn < 4%"],
  roadmap30_60_90: {
    day30: ["MVP ticketing + SLA", "1 piloto corporativo"],
    day60: ["Mantenimiento preventivo", "Portal inquilino v1"],
    day90: ["Módulo ESG básico", "Integración partners"],
  },
};

function buildSections(): VentureSection[] {
  return [
    {
      id: "resumen",
      title: "Resumen Ejecutivo",
      content:
        "AUREA FACILITIES digitaliza operaciones premium en activos corporativos, hospitality y residencial de lujo. MVP SaaS multi-tenant con SLA, mantenimiento predictivo y portal inquilino.",
      format: "markdown",
    },
    {
      id: "mercado",
      title: "Mercado",
      content: researchReport.marketSummary,
      format: "markdown",
    },
    {
      id: "competidores",
      title: "Competidores",
      content: researchReport.competitors.map((c) => `**${c.name}** — ${c.type}`).join("\n"),
      format: "markdown",
    },
    {
      id: "pricing",
      title: "Pricing",
      content:
        "| Plan | Precio | Incluye |\n|------|--------|----------|\n| Core | €299/activo/mes | Ticketing, SLA, mantenimiento |\n| Premium | €499/activo/mes | + Portal inquilino, analytics |\n| Enterprise | Custom | + Concierge, ESG, BMS |",
      format: "markdown",
    },
    {
      id: "ux",
      title: "Brand",
      content:
        "Tono: sofisticado, confiable, discreto. Paleta dorada (#C9A227) y azul profundo (#1A2B4A). Posicionamiento: excelencia operativa silenciosa.",
      format: "markdown",
    },
    {
      id: "prd",
      title: "PRD",
      content: productPRD.executiveSummary,
      format: "markdown",
    },
    {
      id: "mvp",
      title: "MVP",
      content: productPRD.mvpScope.map((s) => `- ${s}`).join("\n"),
      format: "markdown",
    },
    {
      id: "arquitectura",
      title: "Arquitectura",
      content:
        "Next.js 15 + PostgreSQL multi-tenant. API REST para incidencias, SLA engine, jobs de mantenimiento. WebSockets para alertas en tiempo real. Mobile PWA para técnicos.",
      format: "markdown",
    },
    {
      id: "landing",
      title: "Landing",
      content:
        "Landing B2B premium: propuesta de valor facility, casos de uso hospitality/corporate, demo interactiva SLA dashboard, formulario piloto.",
      format: "markdown",
    },
    {
      id: "roadmap",
      title: "GTM",
      content:
        "Ventas directas a property managers. Partnerships con consultoras inmobiliarias premium. Content marketing ESG + facility excellence.",
      format: "markdown",
    },
    {
      id: "kpis",
      title: "KPIs",
      content: "MTTR, SLA compliance, NPS inquilino, activos activos, MRR, expansion revenue.",
      format: "markdown",
    },
  ];
}

function createAureaVenture(): VentureProject {
  const venture: VentureProject = {
    id: AUREA_FACILITIES_VENTURE_ID,
    ideaText: IDEA_TEXT,
    name: "AUREA FACILITIES",
    description: IDEA_TEXT,
    category: "saas",
    targetAudience: "Property managers y facility directors de activos premium",
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
        complejidadTecnica: intelligenceReport.technicalComplexity,
        probabilidadExito: "72",
        tiempoMvp: intelligenceReport.estimatedMvpTime,
        costeDesarrollo: intelligenceReport.estimatedDevelopmentCost,
        modeloNegocio: intelligenceReport.recommendedBusinessModel,
        escalabilidad: intelligenceReport.market.scalability,
      },
      category: "saas",
      targetAudience: intelligenceReport.targetAudience,
      projectName: "AUREA FACILITIES",
    },
    founderAdvisor: mapFounderAdvisorReport(intelligenceReport.founderAdvisor),
    researchReport,
    researchMeta: { source: "mock", usedKnowledgeRefs: [], fallbackUsed: false },
    productPRD,
    productPRDSource: "mock",
    productMeta: {
      source: "mock",
      usedResearch: true,
      usedKnowledgeRefs: [
        { id: "kb-fm", domain: "patterns", title: "Facility Management SaaS playbook" },
        { id: "kb-premium", domain: "business", title: "Premium services GTM" },
      ],
      fallbackUsed: false,
    },
    discoveryContext: {
      clarifiedDecisions: ["B2B SaaS", "Mercado Iberia premium", "Multi-activo"],
      remainingQuestions: [],
      inferredProductType: "SaaS B2B",
      inferredBusinessModel: "Suscripción por activo + módulos",
      targetCustomerHints: ["Facility directors", "Property managers premium"],
      monetizationHints: ["Por activo/mes", "Add-ons concierge/ESG"],
      trustAndSafetyHints: ["SLA contractual", "GDPR"],
      platformHints: ["Web dashboard", "PWA técnicos", "Portal inquilino"],
      buildConstraints: ["MVP 8-10 semanas"],
      answers: [
        {
          questionId: "q1",
          question: "¿Problema principal?",
          answer: "Operaciones fragmentadas sin visibilidad SLA ni experiencia inquilino unificada",
          impacts: ["product"],
          createdAt: now,
        },
        {
          questionId: "q2",
          question: "¿Cliente pagador?",
          answer: "Property manager / asset owner de activos premium",
          impacts: ["gtm"],
          createdAt: now,
        },
        {
          questionId: "q3",
          question: "¿Canal de adquisición?",
          answer: "Ventas directas + partners consultoras inmobiliarias",
          impacts: ["gtm"],
          createdAt: now,
        },
      ],
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

export const AUREA_FACILITIES_VENTURE: VentureProject = createAureaVenture();

export function isAureaFacilitiesVentureId(id: string): boolean {
  return id === AUREA_FACILITIES_VENTURE_ID || id === AUREA_FACILITIES_ALIAS;
}

export function resolveAureaFacilitiesVenture(id: string): VentureProject | undefined {
  return isAureaFacilitiesVentureId(id) ? AUREA_FACILITIES_VENTURE : undefined;
}
