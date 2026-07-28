/** PROGRAM 4700 — Agent Registry seed catalog (read-only skill references). */

import type { MarketplaceAgent, RegistryEntry } from "./types";
import { getSkillById } from "@/lib/skills/registry";

function skillRef(id: string, usage: RegistryEntry["usage"] = "primary"): RegistryEntry {
  const skill = getSkillById(id);
  return {
    skillId: id,
    skillName: skill?.name ?? id,
    category: skill?.category ?? "ai",
    usage,
  };
}

function cap(
  id: string,
  label: string,
  description: string,
  category: RegistryEntry extends never ? never : import("./types").AgentCapability["category"]
): import("./types").AgentCapability {
  return { id, label, description, category };
}

const BASE_VERSION = "1.0.0";

export const AGENT_REGISTRY: MarketplaceAgent[] = [
  {
    id: "agent-ceo",
    slug: "ceo",
    name: "CEO Agent",
    role: "Director General",
    description:
      "Evalúa mercado, competencia, riesgo y probabilidad de éxito. Sintetiza briefs ejecutivos y prioriza decisiones estratégicas del venture.",
    capabilities: [
      cap("strategy", "Estrategia", "Define visión, prioridades y OKRs del venture", "strategy"),
      cap("risk", "Análisis de riesgo", "Identifica riesgos y oportunidades de mercado", "analysis"),
      cap("brief", "Brief ejecutivo", "Genera resúmenes para el fundador y el board", "governance"),
    ],
    skills: [
      skillRef("claude-skill", "primary"),
      skillRef("openai-skill", "secondary"),
      skillRef("ga4", "optional"),
      skillRef("notion", "optional"),
    ],
    estimatedCostPerMonth: 45,
    estimatedCostPerCall: 0.08,
    recommendedProvider: "anthropic",
    aiTask: "ceo-brief",
    version: BASE_VERSION,
    status: "available",
    department: "Executive",
    icon: "◉",
    tags: ["executive", "strategy", "board"],
  },
  {
    id: "agent-cto",
    slug: "cto",
    name: "CTO Agent",
    role: "Director Técnico",
    description:
      "Elige stack, arquitectura, integraciones y criterios técnicos. Supervisa deuda técnica y decisiones de infraestructura.",
    capabilities: [
      cap("arch", "Arquitectura", "Diseña arquitectura de sistemas y APIs", "strategy"),
      cap("stack", "Selección de stack", "Recomienda tecnologías según contexto del venture", "analysis"),
      cap("review", "Revisión técnica", "Evalúa PRs y decisiones de implementación", "governance"),
    ],
    skills: [
      skillRef("github", "primary"),
      skillRef("docker", "primary"),
      skillRef("vercel", "secondary"),
      skillRef("claude-skill", "primary"),
      skillRef("supabase", "optional"),
    ],
    estimatedCostPerMonth: 38,
    estimatedCostPerCall: 0.06,
    recommendedProvider: "openai",
    aiTask: "build-architecture",
    version: BASE_VERSION,
    status: "available",
    department: "Engineering",
    icon: "⚙",
    tags: ["engineering", "architecture", "build"],
  },
  {
    id: "agent-cfo",
    slug: "cfo",
    name: "CFO Agent",
    role: "Director Financiero",
    description:
      "Modela unit economics, burn rate, runway y proyecciones financieras. Supervisa pricing y salud económica del venture.",
    capabilities: [
      cap("model", "Modelado financiero", "Proyecciones de ingresos y gastos", "analysis"),
      cap("pricing", "Pricing", "Recomienda estrategias de precios y márgenes", "strategy"),
      cap("audit", "Auditoría", "Revisa costes de IA y operaciones", "governance"),
    ],
    skills: [
      skillRef("quickbooks", "primary"),
      skillRef("stripe", "secondary"),
      skillRef("ga4", "optional"),
      skillRef("claude-skill", "primary"),
    ],
    estimatedCostPerMonth: 32,
    estimatedCostPerCall: 0.05,
    recommendedProvider: "anthropic",
    aiTask: "classification",
    version: BASE_VERSION,
    status: "available",
    department: "Finance",
    icon: "◈",
    tags: ["finance", "pricing", "runway"],
  },
  {
    id: "agent-cmo",
    slug: "cmo",
    name: "CMO Agent",
    role: "Director de Marketing",
    description:
      "Define posicionamiento, canales de adquisición, campañas y métricas de crecimiento. Coordina narrativa de marca.",
    capabilities: [
      cap("positioning", "Posicionamiento", "Define propuesta de valor y mensajes clave", "strategy"),
      cap("campaigns", "Campañas", "Planifica campañas multicanal", "execution"),
      cap("analytics", "Métricas", "Analiza funnel y CAC/LTV", "analysis"),
    ],
    skills: [
      skillRef("meta-ads", "primary"),
      skillRef("google-ads", "primary"),
      skillRef("seo", "secondary"),
      skillRef("posthog", "optional"),
      skillRef("openai-skill", "primary"),
    ],
    estimatedCostPerMonth: 40,
    estimatedCostPerCall: 0.07,
    recommendedProvider: "openai",
    aiTask: "marketing",
    version: BASE_VERSION,
    status: "available",
    department: "Marketing",
    icon: "◎",
    tags: ["marketing", "growth", "brand"],
  },
  {
    id: "agent-coo",
    slug: "coo",
    name: "COO Agent",
    role: "Director de Operaciones",
    description:
      "Optimiza procesos operativos, SLA internos y coordinación entre departamentos. Supervisa ejecución del plan operativo.",
    capabilities: [
      cap("ops", "Operaciones", "Diseña flujos operativos y SLAs", "operations"),
      cap("coord", "Coordinación", "Sincroniza equipos y dependencias", "execution"),
      cap("kpi", "KPIs operativos", "Monitorea eficiencia y throughput", "analysis"),
    ],
    skills: [
      skillRef("slack", "primary"),
      skillRef("calendar", "primary"),
      skillRef("notion", "secondary"),
      skillRef("claude-skill", "primary"),
    ],
    estimatedCostPerMonth: 28,
    estimatedCostPerCall: 0.04,
    recommendedProvider: "anthropic",
    aiTask: "strategy",
    version: BASE_VERSION,
    status: "available",
    department: "Operations",
    icon: "⊞",
    tags: ["operations", "coordination", "sla"],
  },
  {
    id: "agent-research",
    slug: "research",
    name: "Research Agent",
    role: "Investigación de Mercado",
    description:
      "Analiza mercado, competidores, tendencias y oportunidades. Produce informes de investigación accionables.",
    capabilities: [
      cap("market", "Análisis de mercado", "TAM/SAM/SOM y segmentación", "analysis"),
      cap("competitive", "Competencia", "Benchmarking y mapa competitivo", "analysis"),
      cap("trends", "Tendencias", "Detección de señales emergentes", "strategy"),
    ],
    skills: [
      skillRef("claude-skill", "primary"),
      skillRef("openai-skill", "secondary"),
      skillRef("seo", "optional"),
      skillRef("ga4", "optional"),
    ],
    estimatedCostPerMonth: 35,
    estimatedCostPerCall: 0.09,
    recommendedProvider: "anthropic",
    aiTask: "research",
    version: BASE_VERSION,
    status: "available",
    department: "Intelligence",
    icon: "🔍",
    tags: ["research", "market", "competitive"],
  },
  {
    id: "agent-marketing",
    slug: "marketing",
    name: "Marketing Agent",
    role: "Marketing Táctico",
    description:
      "Crea copy, landing pages, SEO, ASO y contenido de campaña. Ejecuta tácticas de marketing digital.",
    capabilities: [
      cap("copy", "Copywriting", "Genera textos persuasivos y landing copy", "execution"),
      cap("seo", "SEO/ASO", "Optimiza visibilidad orgánica", "execution"),
      cap("content", "Contenido", "Produce calendario editorial y piezas", "execution"),
    ],
    skills: [
      skillRef("seo", "primary"),
      skillRef("meta-ads", "secondary"),
      skillRef("linkedin-ads", "optional"),
      skillRef("openai-skill", "primary"),
    ],
    estimatedCostPerMonth: 30,
    estimatedCostPerCall: 0.05,
    recommendedProvider: "openai",
    aiTask: "marketing",
    version: BASE_VERSION,
    status: "available",
    department: "Marketing",
    icon: "✦",
    tags: ["marketing", "content", "seo"],
  },
  {
    id: "agent-legal",
    slug: "legal",
    name: "Legal Agent",
    role: "Asesor Legal",
    description:
      "Genera privacidad, términos, cookies y checklist RGPD. Revisa contratos y cumplimiento normativo.",
    capabilities: [
      cap("privacy", "Privacidad", "Políticas de privacidad y cookies", "governance"),
      cap("terms", "Términos legales", "Términos de servicio y uso", "governance"),
      cap("compliance", "Cumplimiento", "Checklist RGPD y normativa aplicable", "governance"),
    ],
    skills: [
      skillRef("contracts", "primary"),
      skillRef("docusign", "secondary"),
      skillRef("claude-skill", "primary"),
    ],
    estimatedCostPerMonth: 25,
    estimatedCostPerCall: 0.06,
    recommendedProvider: "anthropic",
    aiTask: "legal",
    version: BASE_VERSION,
    status: "available",
    department: "Legal",
    icon: "§",
    tags: ["legal", "gdpr", "compliance"],
  },
  {
    id: "agent-sales",
    slug: "sales",
    name: "Sales Agent",
    role: "Ventas y CRM",
    description:
      "Gestiona pipeline comercial, propuestas y seguimiento de leads. Sincroniza con CRM y acelera cierre.",
    capabilities: [
      cap("pipeline", "Pipeline", "Gestión de oportunidades y etapas", "operations"),
      cap("proposals", "Propuestas", "Genera propuestas comerciales", "execution"),
      cap("followup", "Seguimiento", "Automatiza follow-ups y recordatorios", "execution"),
    ],
    skills: [
      skillRef("hubspot", "primary"),
      skillRef("pipedrive", "secondary"),
      skillRef("email", "primary"),
      skillRef("openai-skill", "primary"),
    ],
    estimatedCostPerMonth: 28,
    estimatedCostPerCall: 0.04,
    recommendedProvider: "openai",
    aiTask: "classification",
    version: BASE_VERSION,
    status: "beta",
    department: "Sales",
    icon: "◆",
    tags: ["sales", "crm", "pipeline"],
  },
  {
    id: "agent-support",
    slug: "support",
    name: "Support Agent",
    role: "Soporte al Cliente",
    description:
      "Responde tickets, FAQ y escalaciones. Mantiene base de conocimiento y satisfacción del cliente.",
    capabilities: [
      cap("tickets", "Tickets", "Clasificación y respuesta de incidencias", "operations"),
      cap("faq", "FAQ", "Mantiene base de conocimiento", "execution"),
      cap("escalation", "Escalación", "Detecta casos críticos y escala", "governance"),
    ],
    skills: [
      skillRef("slack", "primary"),
      skillRef("email", "primary"),
      skillRef("notion", "secondary"),
      skillRef("claude-skill", "primary"),
    ],
    estimatedCostPerMonth: 22,
    estimatedCostPerCall: 0.03,
    recommendedProvider: "anthropic",
    aiTask: "classification",
    version: BASE_VERSION,
    status: "beta",
    department: "Customer Success",
    icon: "♥",
    tags: ["support", "customer", "tickets"],
  },
  {
    id: "agent-developer",
    slug: "developer",
    name: "Developer Agent",
    role: "Desarrollo de Software",
    description:
      "Implementa features, revisa código y genera PRs. Coordina con CI/CD y estándares de calidad.",
    capabilities: [
      cap("code", "Código", "Genera y revisa implementaciones", "execution"),
      cap("pr", "Pull Requests", "Crea y revisa PRs", "execution"),
      cap("ci", "CI/CD", "Integra pipelines de despliegue", "operations"),
    ],
    skills: [
      skillRef("github", "primary"),
      skillRef("gitlab", "secondary"),
      skillRef("docker", "primary"),
      skillRef("vercel", "secondary"),
      skillRef("claude-skill", "primary"),
    ],
    estimatedCostPerMonth: 42,
    estimatedCostPerCall: 0.08,
    recommendedProvider: "openai",
    aiTask: "code",
    version: BASE_VERSION,
    status: "available",
    department: "Engineering",
    icon: "⚒",
    tags: ["development", "code", "cicd"],
  },
  {
    id: "agent-qa",
    slug: "qa",
    name: "QA Agent",
    role: "Calidad y Testing",
    description:
      "Diseña casos de prueba, ejecuta QA y reporta regresiones. Valida criterios de aceptación del producto.",
    capabilities: [
      cap("testplan", "Plan de pruebas", "Diseña suites y casos de prueba", "analysis"),
      cap("regression", "Regresión", "Detecta regresiones en releases", "operations"),
      cap("acceptance", "Aceptación", "Valida criterios de aceptación", "governance"),
    ],
    skills: [
      skillRef("github", "primary"),
      skillRef("docker", "secondary"),
      skillRef("claude-skill", "primary"),
    ],
    estimatedCostPerMonth: 26,
    estimatedCostPerCall: 0.05,
    recommendedProvider: "openai",
    aiTask: "code",
    version: BASE_VERSION,
    status: "beta",
    department: "Engineering",
    icon: "✓",
    tags: ["qa", "testing", "quality"],
  },
  {
    id: "agent-data",
    slug: "data",
    name: "Data Agent",
    role: "Análisis de Datos",
    description:
      "Analiza métricas de producto, construye dashboards y detecta patrones. Alimenta decisiones con datos.",
    capabilities: [
      cap("metrics", "Métricas", "Define y monitoriza KPIs de producto", "analysis"),
      cap("dashboards", "Dashboards", "Diseña paneles analíticos", "execution"),
      cap("insights", "Insights", "Extrae patrones y recomendaciones", "strategy"),
    ],
    skills: [
      skillRef("ga4", "primary"),
      skillRef("posthog", "primary"),
      skillRef("mixpanel", "secondary"),
      skillRef("supabase", "optional"),
      skillRef("claude-skill", "primary"),
    ],
    estimatedCostPerMonth: 34,
    estimatedCostPerCall: 0.06,
    recommendedProvider: "anthropic",
    aiTask: "classification",
    version: BASE_VERSION,
    status: "available",
    department: "Analytics",
    icon: "◫",
    tags: ["data", "analytics", "metrics"],
  },
];

export function getAgentById(idOrSlug: string): MarketplaceAgent | undefined {
  const key = idOrSlug.toLowerCase();
  return AGENT_REGISTRY.find((a) => a.id === key || a.slug === key);
}

export function listAllAgents(): MarketplaceAgent[] {
  return [...AGENT_REGISTRY];
}

export function listAgentsByDepartment(department: string): MarketplaceAgent[] {
  return AGENT_REGISTRY.filter((a) => a.department.toLowerCase() === department.toLowerCase());
}

export function listAgentsByTag(tag: string): MarketplaceAgent[] {
  return AGENT_REGISTRY.filter((a) => a.tags.includes(tag.toLowerCase()));
}
