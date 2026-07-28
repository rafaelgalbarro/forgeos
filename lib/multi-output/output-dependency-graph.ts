/** PROGRAM 5390 — Official output dependency graph (single source of truth). */

import type { MultiOutputKind, OutputDependency } from "./types";

/** Official dependency edges — no duplicate values elsewhere */
export const OFFICIAL_DEPENDENCIES: OutputDependency[] = [
  // Company DNA → Brand → Website → App UI → Mobile UI
  { from: "VENTURE", to: "BRAND", reason: "Identidad de empresa alimenta marca" },
  { from: "BRAND", to: "WEBSITE", reason: "Design tokens y tono de marca", requiresApproval: true },
  { from: "BRAND", to: "WEB_APP", reason: "Design system compartido", requiresApproval: true },
  { from: "BRAND", to: "MOBILE", reason: "Design tokens móviles", requiresApproval: true },
  { from: "BRAND", to: "INVESTOR", reason: "Identidad visual en deck", requiresApproval: true },
  { from: "BRAND", to: "GTM", reason: "Materiales de marketing alineados", requiresApproval: true },
  { from: "WEBSITE", to: "WEB_APP", reason: "Navegación y SEO compartidos" },
  { from: "WEB_APP", to: "MOBILE", reason: "Flujos de usuario compartidos" },

  // PRD → Architecture → Backend → API → Web/Mobile
  { from: "VENTURE", to: "BACKEND", reason: "PRD y reglas de negocio" },
  { from: "BACKEND", to: "DATABASE", reason: "Esquema derivado de entidades" },
  { from: "BACKEND", to: "API", reason: "Contratos de endpoints" },
  { from: "API", to: "WEB_APP", reason: "Tipos y schemas compartidos" },
  { from: "API", to: "MOBILE", reason: "Contratos móviles" },

  // Build Context → technical outputs
  { from: "VENTURE", to: "WEBSITE", reason: "Build context — copy y positioning" },
  { from: "VENTURE", to: "WEB_APP", reason: "Build context — features y roles" },
  { from: "VENTURE", to: "MOBILE", reason: "Build context — escenarios campo" },

  // Pricing → Website + App + Financial + Investor Deck
  { from: "VENTURE", to: "WEBSITE", reason: "Pricing en landing" },
  { from: "VENTURE", to: "WEB_APP", reason: "Billing en app" },
  { from: "VENTURE", to: "INVESTOR", reason: "Modelo financiero" },
  { from: "VENTURE", to: "GTM", reason: "Estrategia de precios GTM" },

  // Deployment depends on technical outputs
  { from: "WEBSITE", to: "DEPLOYMENT", reason: "Preview web" },
  { from: "WEB_APP", to: "DEPLOYMENT", reason: "Preview app" },
  { from: "BACKEND", to: "DEPLOYMENT", reason: "Preview API" },
  { from: "API", to: "DEPLOYMENT", reason: "Contratos desplegados" },

  // Operational
  { from: "VENTURE", to: "OPERATIONAL", reason: "Procesos y roles operativos" },
  { from: "GTM", to: "OPERATIONAL", reason: "Playbooks de lanzamiento" },
];

const dependencyMap = new Map<MultiOutputKind, MultiOutputKind[]>();
const reverseMap = new Map<MultiOutputKind, MultiOutputKind[]>();

for (const dep of OFFICIAL_DEPENDENCIES) {
  const existing = dependencyMap.get(dep.to) ?? [];
  if (!existing.includes(dep.from)) existing.push(dep.from);
  dependencyMap.set(dep.to, existing);

  const rev = reverseMap.get(dep.from) ?? [];
  if (!rev.includes(dep.to)) rev.push(dep.to);
  reverseMap.set(dep.from, rev);
}

export function getDependenciesFor(kind: MultiOutputKind): MultiOutputKind[] {
  return dependencyMap.get(kind) ?? [];
}

export function getDependentsOf(kind: MultiOutputKind): MultiOutputKind[] {
  return reverseMap.get(kind) ?? [];
}

export function getDirectDependencies(kind: MultiOutputKind): OutputDependency[] {
  return OFFICIAL_DEPENDENCIES.filter((d) => d.to === kind);
}

/** Topological sort for generation order */
export function topologicalSort(kinds: MultiOutputKind[]): MultiOutputKind[] {
  const set = new Set(kinds);
  const visited = new Set<MultiOutputKind>();
  const result: MultiOutputKind[] = [];

  function visit(kind: MultiOutputKind) {
    if (visited.has(kind) || !set.has(kind)) return;
    visited.add(kind);
    for (const dep of getDependenciesFor(kind)) {
      if (set.has(dep)) visit(dep);
    }
    result.push(kind);
  }

  for (const kind of kinds) visit(kind);
  return result;
}

/** Check if two outputs can run in parallel (no dependency conflict) */
export function canRunInParallel(a: MultiOutputKind, b: MultiOutputKind): boolean {
  if (a === b) return false;
  const aDeps = getDependenciesFor(a);
  const bDeps = getDependenciesFor(b);
  if (aDeps.includes(b) || bDeps.includes(a)) return false;

  // Brand unapproved blocks website UI + app UI
  const brandBlocks = ["WEBSITE", "WEB_APP", "MOBILE"];
  if (a === "BRAND" && brandBlocks.includes(b)) return false;
  if (b === "BRAND" && brandBlocks.includes(a)) return false;

  return true;
}

/** Get all transitive dependents affected by a change to `kind` */
export function getTransitiveDependents(kind: MultiOutputKind): MultiOutputKind[] {
  const result = new Set<MultiOutputKind>();
  const queue = [kind];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const dep of getDependentsOf(current)) {
      if (!result.has(dep)) {
        result.add(dep);
        queue.push(dep);
      }
    }
  }
  return Array.from(result);
}
