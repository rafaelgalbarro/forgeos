/** Program 3000 Sprint 2 + 4100 — legacy route mapping. */

export interface LegacyRouteRedirect {
  from: string;
  to: string;
  label: string;
  reason: string;
}

export const LEGACY_ROUTE_REDIRECTS: LegacyRouteRedirect[] = [
  {
    from: "/dashboard",
    to: "/command-center",
    label: "Command Center",
    reason: "El dashboard CEO se ha consolidado en Command Center.",
  },
  {
    from: "/founder",
    to: "/command-center",
    label: "Command Center",
    reason: "La experiencia fundador se ha consolidado en Command Center.",
  },
  {
    from: "/creator",
    to: "/command-center",
    label: "Command Center",
    reason: "Creator Flow permanece aquí; el hub principal es Command Center.",
  },
  {
    from: "/os/creator",
    to: "/command-center",
    label: "Command Center",
    reason: "Usa Command Center como punto de entrada unificado.",
  },
];

export function resolveLegacyRedirect(pathname: string): LegacyRouteRedirect | null {
  const normalized = pathname.split("?")[0].replace(/\/$/, "") || "/";
  return LEGACY_ROUTE_REDIRECTS.find((r) => r.from === normalized) ?? null;
}

export function getUnifiedJourneyLinks(): { label: string; href: string; description: string }[] {
  return [
    { label: "Command Center", href: "/command-center", description: "Centro de mando unificado" },
    { label: "Onboarding", href: "/onboarding", description: "Configura tu perfil y primera venture" },
    { label: "Workspace", href: "/workspace", description: "Centro de operaciones" },
    { label: "ForgeOS", href: "/os", description: "Sistema operativo" },
    { label: "Founder Journey", href: "/founder-journey", description: "Recorrido por fases" },
    { label: "Labs", href: "/labs", description: "Índice de laboratorios" },
  ];
}
