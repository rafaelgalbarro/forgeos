/** Venture Platform — capability registry. */

import type { ProgramCapability } from "../shared";

const capabilities: ProgramCapability[] = [
  {
    id: "launch",
    label: "Launch",
    description: "Branding, landing, SEO y go-to-market.",
    status: "scaffold",
  },
  {
    id: "growth",
    label: "Growth",
    description: "CAC, LTV, funnels y experimentos.",
    status: "scaffold",
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Sistema de notificaciones del estudio.",
    status: "active",
  },
  {
    id: "headquarters",
    label: "Headquarters",
    description: "Operaciones centrales del venture studio.",
    status: "active",
  },
  {
    id: "orgs",
    label: "Organizations",
    description: "Multi-tenant orgs (scaffold SaaS).",
    status: "scaffold",
  },
  {
    id: "teams",
    label: "Teams",
    description: "Equipos y permisos (scaffold SaaS).",
    status: "scaffold",
  },
  {
    id: "api",
    label: "Platform API",
    description: "API pública de plataforma (scaffold).",
    status: "scaffold",
  },
  {
    id: "billing",
    label: "Billing",
    description: "Facturación y suscripciones (scaffold).",
    status: "scaffold",
  },
];

export function listVenturePlatformCapabilities(): ProgramCapability[] {
  return [...capabilities];
}
