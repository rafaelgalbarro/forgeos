/** ForgeOS Universal Skill Store — dependency resolution (RC4.8). */

import type { DependencyEdge, DependencyGraph, DependencyNode, SkillListing, StoreItem } from "./types";

const SKILL_DEPS: Record<string, string[]> = {
  vercel: ["github", "docker"],
  netlify: ["github"],
  railway: ["github", "docker"],
  "meta-ads": ["ga4"],
  "google-ads": ["ga4"],
  stripe: ["quickbooks"],
  hubspot: ["email"],
  salesforce: ["email"],
  supabase: ["github"],
  firebase: ["github"],
  "openai-skill": ["local-storage"],
  "claude-skill": ["local-storage"],
  aws: ["docker", "github"],
  azure: ["docker", "github"],
  gcp: ["docker", "github"],
  "productivity-messaging": ["productivity-email"],
  "productivity-meetings": ["productivity-calendar"],
  "marketing-campaigns": ["marketing-analytics"],
  "marketing-ads": ["marketing-analytics", "stripe"],
  "business-payments": ["business-billing"],
  "business-invoices": ["business-billing", "business-accounting"],
};

const PACK_DEPS: Record<string, string[]> = {
  "tpl-saas-starter": ["github", "vercel", "supabase"],
  "tpl-api-only": ["github", "docker"],
  "pack-venture-playbook": ["productivity-knowledge"],
  "pack-growth-prompts": ["marketing-seo", "marketing-analytics"],
};

function buildNodes(ids: Set<string>, items: StoreItem[]): DependencyNode[] {
  const byId = new Map(items.map((i) => [i.id, i]));
  return [...ids].map((id) => {
    const item = byId.get(id);
    return {
      id,
      name: item?.name ?? id,
      category: item?.category ?? "skills",
    };
  });
}

function buildEdges(rootId: string, deps: string[]): DependencyEdge[] {
  return deps.map((to) => ({
    from: rootId,
    to,
    type: "requires" as const,
  }));
}

export function resolveSkillDependencies(skill: SkillListing): string[] {
  const direct = SKILL_DEPS[skill.id] ?? [];
  const credDeps = skill.requiredCredentials.length > 0 ? ["local-storage"] : [];
  return [...new Set([...direct, ...credDeps])];
}

export function buildDependencyGraph(rootId: string, items: StoreItem[]): DependencyGraph | undefined {
  const root = items.find((i) => i.id === rootId);
  if (!root) return undefined;

  const deps = SKILL_DEPS[rootId] ?? PACK_DEPS[rootId] ?? [];
  const nodeIds = new Set<string>([rootId, ...deps]);

  for (const dep of deps) {
    const transitive = SKILL_DEPS[dep] ?? [];
    for (const t of transitive) nodeIds.add(t);
  }

  return {
    id: `dep-${rootId}`,
    name: `${root.name} Dependencies`,
    category: "dependencies",
    version: root.version,
    description: `Dependency graph for ${root.name}`,
    tags: ["dependencies", root.category],
    source: "lib/skills-store/dependencies",
    updatedAt: root.updatedAt,
    status: root.status,
    rootId,
    nodes: buildNodes(nodeIds, items),
    edges: [
      ...buildEdges(rootId, deps),
      ...deps.flatMap((d) => buildEdges(d, SKILL_DEPS[d] ?? [])),
    ],
  };
}

export function buildAllDependencyGraphs(items: StoreItem[]): DependencyGraph[] {
  const roots = [
    ...Object.keys(SKILL_DEPS),
    ...Object.keys(PACK_DEPS),
  ];
  const graphs: DependencyGraph[] = [];
  const seen = new Set<string>();

  for (const rootId of roots) {
    if (seen.has(rootId)) continue;
    const graph = buildDependencyGraph(rootId, items);
    if (graph) {
      graphs.push(graph);
      seen.add(rootId);
    }
  }
  return graphs;
}

export function getDependents(itemId: string, graphs: DependencyGraph[]): string[] {
  const dependents = new Set<string>();
  for (const g of graphs) {
    for (const edge of g.edges) {
      if (edge.to === itemId && edge.from !== itemId) dependents.add(edge.from);
    }
  }
  return [...dependents];
}

export function canInstall(
  itemId: string,
  installedIds: Set<string>,
  items: StoreItem[],
  graphs: DependencyGraph[]
): { ok: boolean; missing: string[] } {
  const graph = graphs.find((g) => g.rootId === itemId) ?? buildDependencyGraph(itemId, items);
  if (!graph) return { ok: true, missing: [] };

  const required = graph.edges
    .filter((e) => e.from === itemId && e.type === "requires")
    .map((e) => e.to);

  const missing = required.filter((id) => !installedIds.has(id));
  return { ok: missing.length === 0, missing };
}
