/** Registry of 9 post-deploy company management workspaces. */

import type { CompanyWorkspace, CompanyWorkspaceId } from "./types";

export const COMPANY_WORKSPACES: CompanyWorkspace[] = [
  {
    id: "marketing",
    label: "Marketing",
    labelEs: "Marketing",
    icon: "📣",
    description: "Campañas, canales y agentes de marketing",
    adapterSource: "marketplace",
  },
  {
    id: "seo",
    label: "SEO",
    labelEs: "SEO",
    icon: "🔍",
    description: "Métricas y estrategia SEO",
    adapterSource: "marketplace",
  },
  {
    id: "roadmap",
    label: "Roadmap",
    labelEs: "Roadmap",
    icon: "🗺️",
    description: "Hoja de ruta del producto",
    adapterSource: "self-evolution",
  },
  {
    id: "customerFeedback",
    label: "Customer Feedback",
    labelEs: "Feedback clientes",
    icon: "💬",
    description: "Feedback de design partners y beta",
    adapterSource: "customer-success",
  },
  {
    id: "nps",
    label: "NPS",
    labelEs: "NPS",
    icon: "⭐",
    description: "Net Promoter Score",
    adapterSource: "customer-success",
  },
  {
    id: "kpis",
    label: "KPIs",
    labelEs: "KPIs",
    icon: "📊",
    description: "Indicadores clave de rendimiento",
    adapterSource: "customer-success",
  },
  {
    id: "productMetrics",
    label: "Product Metrics",
    labelEs: "Métricas producto",
    icon: "📈",
    description: "Uso y engagement del producto",
    adapterSource: "customer-success",
  },
  {
    id: "backlog",
    label: "Backlog",
    labelEs: "Backlog",
    icon: "📋",
    description: "Items pendientes del producto",
    adapterSource: "local",
  },
  {
    id: "incidents",
    label: "Incidents",
    labelEs: "Incidentes",
    icon: "🚨",
    description: "Tracker de incidentes de producción",
    adapterSource: "production",
  },
];

export function getWorkspaceById(id: CompanyWorkspaceId): CompanyWorkspace | undefined {
  return COMPANY_WORKSPACES.find((w) => w.id === id);
}

export function listWorkspaceIds(): CompanyWorkspaceId[] {
  return COMPANY_WORKSPACES.map((w) => w.id);
}
