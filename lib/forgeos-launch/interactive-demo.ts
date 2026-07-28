/** Program 7000 — Interactive demo mode config */

import type { DemoScenario } from "./types";

export const DEMO_SCENARIOS: DemoScenario[] = [
  {
    id: "venture-factory",
    title: "Venture Factory",
    description: "Genera una venture demo completa en minutos.",
    cta: "Abrir Venture Factory",
    href: "/venture-factory",
  },
  {
    id: "founder-journey",
    title: "Founder Journey",
    description: "Sigue el recorrido guiado del fundador.",
    cta: "Iniciar journey",
    href: "/founder-journey",
  },
  {
    id: "live-ops",
    title: "Live Operations",
    description: "Explora el centro de operaciones en dry-run.",
    cta: "Ver Live Ops",
    href: "/live",
  },
  {
    id: "marketplace",
    title: "Marketplace",
    description: "Preview de extensiones y templates del ecosistema.",
    cta: "Ver marketplace",
    href: "/marketplace",
  },
];

export const DEMO_MODE_CONFIG = {
  id: "forgeos-1.0-demo",
  title: "Demo interactiva ForgeOS 1.0",
  description: "Modo exploración sin registro. Datos en localStorage.",
  dryRun: true,
  maxDurationMinutes: 30,
} as const;

export function listDemoScenarios(): DemoScenario[] {
  return DEMO_SCENARIOS;
}

export function getDemoModeConfig() {
  return DEMO_MODE_CONFIG;
}
