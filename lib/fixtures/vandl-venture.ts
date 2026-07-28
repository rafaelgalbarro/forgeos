/**
 * VANDL — canonical RC1 E2E venture fixture.
 * Vandalism & Asset Notification Detection Layer — property security SaaS.
 */

import type { VentureProject, VentureSection } from "@/lib/domain/venture";
import type { ForgeIntelligenceReport } from "@/lib/intelligence/types";
import type { ProductPRD } from "@/lib/ai/types/product";
import type { ResearchReport } from "@/lib/ai/types/research";
import { runVentureSimulator } from "@/lib/venture-simulator";
import { mapFounderAdvisorReport } from "@/lib/domain/founder-advisor";

export const VANDL_VENTURE_ID = "demo-venture-vandl";
export const VANDL_VENTURE_ALIAS = "vandl";

const IDEA_TEXT =
  "VANDL es una plataforma SaaS de detección de vandalismo y protección de activos para administradores de fincas y retail, usando cámaras IP y alertas en tiempo real.";

const now = "2026-07-01T10:00:00.000Z";

const intelligenceReport: ForgeIntelligenceReport = {
  ideaText: IDEA_TEXT,
  projectName: "VANDL",
  category: "saas",
  targetAudience: "Administradores de fincas, retail y facility managers en España",
  tags: [
    { id: "t1", label: "PropTech", category: "product" },
    { id: "t2", label: "Computer Vision", category: "tech" },
    { id: "t3", label: "B2B SaaS", category: "business" },
  ],
  startupScore: 74,
  risks: [
    { title: "Falsos positivos", description: "Alertas por lluvia o sombras", severity: "media" },
    { title: "Privacidad RGPD", description: "Grabación en espacios comunes", severity: "alta" },
  ],
  opportunities: [
    { title: "Retail shrinkage", description: "Pérdidas por vandalismo en tiendas", probability: "alta" },
    { title: "Seguros", description: "Partnership con aseguradoras", probability: "media" },
  ],
  recommendedBusinessModel: "Suscripción mensual por cámara + tier enterprise",
  technicalComplexity: "Media-Alta",
  estimatedMvpTime: "10-12 semanas",
  estimatedDevelopmentCost: "€45k-€65k",
  launchPriority: "alta",
  founderAdvisor: {
    headline: "Oportunidad clara en PropTech con barrera técnica defendible",
    summary: "El mercado de facility security está fragmentado. VANDL puede diferenciarse con detección edge + compliance RGPD nativo.",
    stance: "proceed",
    risks: [
      { title: "Integración cámaras", description: "ONVIF/RTSP heterogéneo", severity: "media" },
    ],
    opportunities: [
      { title: "Comunidades de vecinos", description: "Demanda creciente post-2024", probability: "alta" },
    ],
    alternatives: [
      { title: "MVP alertas manuales", description: "Sin CV en v1", rationale: "Reduce time-to-market" },
    ],
    recommendations: [
      { text: "Validar con 5 administradores de fincas", reason: "Confirmar willingness to pay" },
    ],
    questions: ["¿Integración con porteros automáticos?", "¿Modelo por comunidad o por cámara?"],
    shouldCompare: true,
  },
  market: {
    tamEstimate: "€2.1B (facility security EU)",
    growthTrend: "12% CAGR",
    competitionLevel: "Media",
    innovationLevel: "Alta",
    successProbability: "68%",
    scalability: "Alta — multi-tenant SaaS",
  },
  competition: {
    landscape: "Incumbentes hardware-heavy; pocos SaaS puros en España",
    incumbents: ["Verkada", "Milestone", "Securitas Direct"],
    windowOfOpportunity: "18-24 meses antes de consolidación",
    differentiationAngle: "Edge AI + RGPD + pricing SMB",
  },
  businessModel: {
    recommended: "SaaS por cámara",
    alternatives: ["Freemium 2 cámaras", "Enterprise flat"],
    revenueMechanism: "MRR por dispositivo + setup fee",
    reasoning: "Alineado con coste marginal de procesamiento",
  },
  generatedAt: now,
  source: "heuristic",
};

const researchReport: ResearchReport = {
  marketSummary:
    "El mercado de video vigilancia inteligente en España crece impulsado por normativa de seguridad en comunidades y retail. VANDL encaja en el segmento mid-market no cubierto por soluciones enterprise.",
  targetSegments: ["Administradores de fincas", "Retail 5-50 tiendas", "Coworkings y parkings"],
  competitors: [
    {
      name: "Verkada",
      type: "SaaS global",
      strengths: ["Marca", "Hardware propio"],
      weaknesses: ["Precio USD", "No localizado RGPD"],
    },
    {
      name: "Camlytics",
      type: "Analytics",
      strengths: ["CV maduro"],
      weaknesses: ["Sin alertas operativas", "UX compleja"],
    },
  ],
  marketRisks: ["Regulación biometría", "Competencia de operadores telecom"],
  opportunities: ["Incentivos seguridad comunidades", "Integración seguros"],
  differentiationAngles: ["Detección vandalismo específica", "Alertas WhatsApp/SMS", "Dashboard facility manager"],
  validationPlan: ["10 entrevistas facility managers", "POC 2 comunidades piloto"],
  recommendedNextQuestions: ["SLA de alerta aceptable", "Integración con CMS existente"],
};

const productPRD: ProductPRD = {
  executiveSummary:
    "VANDL detecta vandalismo y intrusiones en tiempo real, alertando a facility managers con evidencia visual y workflow de respuesta.",
  problemStatement:
    "Los administradores de fincas reciben reclamaciones tardías y carecen de visibilidad proactiva sobre vandalismo en zonas comunes.",
  targetCustomer: "Facility manager con 10-200 cámaras IP",
  valueProposition: "Reduce tiempo de respuesta a incidentes en un 70% con alertas inteligentes",
  mvpScope: [
    "Onboarding cámaras RTSP/ONVIF",
    "Detección vandalismo básica (edge)",
    "Dashboard alertas + historial",
    "Notificaciones email/push",
  ],
  v2Features: ["Integración porteros", "Informes para seguros", "Analytics por zona"],
  userStories: [
    "Como facility manager quiero recibir alertas en <30s cuando se detecte vandalismo",
    "Como administrador quiero exportar clip del incidente para el seguro",
  ],
  mainScreens: ["Dashboard alertas", "Mapa de cámaras", "Detalle incidente", "Configuración"],
  coreFlows: ["Conectar cámara", "Recibir alerta", "Revisar clip", "Marcar falso positivo"],
  assumptions: ["Cámaras con stream RTSP", "Conectividad estable"],
  risks: ["Falsos positivos", "Latencia en edge débil"],
  successMetrics: ["MTTA < 2 min", "Precisión > 85%", "Churn < 5%"],
  roadmap30_60_90: {
    day30: ["MVP alertas", "2 pilotos"],
    day60: ["App móvil", "Integración email"],
    day90: ["Tier enterprise", "API partners"],
  },
};

function buildSections(): VentureSection[] {
  return [
    {
      id: "resumen",
      title: "Resumen Ejecutivo",
      content:
        "VANDL protege activos físicos con detección inteligente de vandalismo. MVP SaaS multi-tenant con edge processing y compliance RGPD.",
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
        "Next.js 15 + Supabase + Edge Functions para ingestión RTSP. Microservicio CV en Python (YOLO fine-tuned). Redis para cola de alertas.",
      format: "markdown",
    },
    {
      id: "base-datos",
      title: "Base de datos",
      content: "PostgreSQL: tenants, cameras, incidents, alerts, users. RLS multi-tenant.",
      format: "markdown",
    },
    {
      id: "backend",
      title: "Backend",
      content: "API REST: /cameras, /incidents, /alerts. Webhooks para integraciones.",
      format: "code",
    },
    {
      id: "frontend",
      title: "Frontend",
      content: "Dashboard React: mapa de cámaras, feed de alertas, reproductor de clips.",
      format: "markdown",
    },
    {
      id: "qa",
      title: "QA",
      content: "Playwright E2E, tests de precisión CV con dataset sintético, checklist RGPD.",
      format: "markdown",
    },
    {
      id: "landing",
      title: "Landing",
      content: "Landing B2B: propuesta de valor, demo video, formulario piloto.",
      format: "markdown",
    },
    {
      id: "kpis",
      title: "KPIs",
      content: "MTTA, precisión detección, cámaras activas, MRR.",
      format: "markdown",
    },
  ];
}

function createVandlVenture(): VentureProject {
  const venture: VentureProject = {
    id: VANDL_VENTURE_ID,
    ideaText: IDEA_TEXT,
    name: "VANDL",
    description: IDEA_TEXT,
    category: "saas",
    targetAudience: "Administradores de fincas y facility managers",
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
        probabilidadExito: "68",
        tiempoMvp: intelligenceReport.estimatedMvpTime,
        costeDesarrollo: intelligenceReport.estimatedDevelopmentCost,
        modeloNegocio: intelligenceReport.recommendedBusinessModel,
        escalabilidad: intelligenceReport.market.scalability,
      },
      category: "saas",
      targetAudience: intelligenceReport.targetAudience,
      projectName: "VANDL",
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
        { id: "kb-proptech", domain: "patterns", title: "PropTech SaaS playbook" },
        { id: "kb-cv", domain: "tech", title: "Edge CV deployment patterns" },
      ],
      fallbackUsed: false,
    },
    discoveryContext: {
      clarifiedDecisions: ["B2B SaaS", "Mercado España", "Edge processing"],
      remainingQuestions: [],
      inferredProductType: "SaaS B2B",
      inferredBusinessModel: "Suscripción por cámara",
      targetCustomerHints: ["Facility managers", "Administradores fincas"],
      monetizationHints: ["Por cámara/mes", "Setup fee"],
      trustAndSafetyHints: ["RGPD", "No biometría"],
      platformHints: ["Web dashboard", "App móvil alertas"],
      buildConstraints: ["MVP 10 semanas"],
      answers: [
        {
          questionId: "q1",
          question: "¿Problema principal?",
          answer: "Vandalismo sin detección proactiva en zonas comunes",
          impacts: ["product"],
          createdAt: now,
        },
        {
          questionId: "q2",
          question: "¿Cliente pagador?",
          answer: "Administrador de fincas / facility manager",
          impacts: ["gtm"],
          createdAt: now,
        },
        {
          questionId: "q3",
          question: "¿Canal de adquisición?",
          answer: "Ventas directas + partners facility management",
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

export const VANDL_VENTURE: VentureProject = createVandlVenture();

export function isVandlVentureId(id: string): boolean {
  return id === VANDL_VENTURE_ID || id === VANDL_VENTURE_ALIAS;
}

export function resolveVandlVenture(id: string): VentureProject | undefined {
  return isVandlVentureId(id) ? VANDL_VENTURE : undefined;
}
