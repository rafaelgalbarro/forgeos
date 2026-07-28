/** Build Registry — project templates (Epic 6.2). */

import { createBuildRegistry, registerMany } from "./registry";
import type { BuildRegistry, RegistryCapability, RegistryEntry } from "./types";

const V = "1.0.0";
const NOW = "2026-07-06T00:00:00.000Z";

function cap(...items: [string, string, string?][]): RegistryCapability[] {
  return items.map(([id, label, description]) => ({ id, label, description }));
}

function template(
  id: string,
  name: string,
  status: RegistryEntry["status"],
  description: string,
  capabilities: RegistryCapability[],
  category: string,
  tags: string[] = []
): RegistryEntry {
  return {
    id,
    name,
    type: "template",
    version: V,
    status,
    description,
    capabilities,
    category,
    tags,
    updatedAt: NOW,
  };
}

export const OFFICIAL_TEMPLATES: RegistryEntry[] = [
  template(
    "tpl-saas-starter",
    "SaaS Starter",
    "stable",
    "Full-stack SaaS scaffold — auth, billing stubs, dashboard, and FHIS shell.",
    cap(
      ["auth-stub", "Auth Stub", "Login/signup placeholders"],
      ["dashboard", "Dashboard", "KPI and pipeline views"],
      ["fhis-shell", "FHIS Shell", "Design-system layout"],
    ),
    "full-stack",
    ["saas", "nextjs", "fhis"]
  ),
  template(
    "tpl-landing-page",
    "Landing Page",
    "stable",
    "Marketing landing with hero, features, pricing, and CTA sections.",
    cap(
      ["hero", "Hero", "Above-the-fold section"],
      ["pricing", "Pricing", "Tier comparison table"],
      ["cta", "CTA", "Conversion call-to-action"],
    ),
    "marketing",
    ["landing", "marketing"]
  ),
  template(
    "tpl-dashboard",
    "Dashboard Template",
    "stable",
    "Admin dashboard with sidebar, KPI grid, and data tables.",
    cap(
      ["sidebar", "Sidebar", "Navigation shell"],
      ["kpi-grid", "KPI Grid", "Metric cards"],
      ["data-table", "Data Table", "Tabular data views"],
    ),
    "dashboard",
    ["dashboard", "fhis", "admin"]
  ),
  template(
    "tpl-api-only",
    "API-Only Backend",
    "beta",
    "Headless API project with route handlers, Prisma, and OpenAPI docs.",
    cap(
      ["api-routes", "API Routes", "REST endpoints"],
      ["prisma", "Prisma", "Database layer"],
      ["openapi", "OpenAPI", "API documentation"],
    ),
    "backend",
    ["api", "headless"]
  ),
  template(
    "tpl-lab-console",
    "Lab Console",
    "beta",
    "ForgeOS lab page pattern with FHIS panels, badges, and mock actions.",
    cap(
      ["lab-pattern", "Lab Pattern", "Epic lab page scaffold"],
      ["fhis-panels", "FHIS Panels", "Panel and Card layout"],
      ["mock-actions", "Mock Actions", "Demo button wiring"],
    ),
    "lab",
    ["lab", "fhis", "forgeos"]
  ),
  template(
    "tpl-mobile-pwa",
    "Mobile PWA",
    "experimental",
    "Progressive web app with responsive FHIS components and offline shell.",
    cap(
      ["pwa", "PWA", "Service worker scaffold"],
      ["responsive", "Responsive", "Mobile-first layout"],
    ),
    "mobile",
    ["pwa", "mobile"]
  ),
];

export function createTemplateRegistry(): BuildRegistry {
  const registry = createBuildRegistry();
  registerMany(registry, OFFICIAL_TEMPLATES);
  return registry;
}

export function registerTemplates(target: BuildRegistry): RegistryEntry[] {
  return registerMany(target, OFFICIAL_TEMPLATES);
}
