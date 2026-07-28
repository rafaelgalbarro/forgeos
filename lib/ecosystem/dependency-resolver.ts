/** RC9 — Dependency resolver (composes skills-store + ecosystem). */

import { buildAllDependencyGraphs, canInstall } from "@/lib/skills-store/dependencies";
import { buildStoreCatalog, getStoreItemById } from "@/lib/skills-store/registry";
import { getEcosystemPackById } from "./catalog";
import type { DependencyResolution } from "./types";

const ECOSYSTEM_DEPS: Record<string, string[]> = {
  "eco-pack-crm": ["hubspot", "email", "business-billing", "eco-plugin-crm-sync"],
  "eco-pack-ai-ceo": ["openai-skill", "claude-skill"],
  "eco-pack-growth": ["marketing-analytics", "ga4", "pack-growth-prompts"],
  "eco-cap-sales": ["hubspot"],
  "eco-plugin-crm-sync": ["hubspot"],
  "eco-plugin-analytics": ["ga4"],
  "eco-knowledge-playbook": ["pack-venture-playbook"],
  "eco-dept-revenue": ["hubspot", "stripe"],
};

export function resolvePackDependencies(packId: string): DependencyResolution {
  const pack = getEcosystemPackById(packId);
  const deps = pack?.dependencies ?? ECOSYSTEM_DEPS[packId] ?? [];
  const catalog = buildStoreCatalog();
  const graphs = buildAllDependencyGraphs(catalog);
  const installed = new Set<string>();

  const graph: DependencyResolution["graph"] = deps.map((to) => ({
    from: packId,
    to,
    type: "requires" as const,
  }));

  const resolved: string[] = [];
  const missing: string[] = [];

  for (const dep of deps) {
    const ecoPack = getEcosystemPackById(dep);
    const storeItem = getStoreItemById(dep);
    if (ecoPack || storeItem) {
      const check = canInstall(dep, installed, catalog, graphs);
      if (check.ok || storeItem || ecoPack) {
        resolved.push(dep);
      } else {
        missing.push(...check.missing);
      }
    } else {
      missing.push(dep);
    }
  }

  return {
    packId,
    resolved,
    missing: [...new Set(missing)],
    optional: [],
    graph,
  };
}

export function getDependencyGraphForPack(packId: string): DependencyResolution {
  return resolvePackDependencies(packId);
}

export { buildAllDependencyGraphs, canInstall };
