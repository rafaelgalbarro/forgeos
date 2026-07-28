/** PROGRAM 4700 — Marketplace catalog aggregator for listing page. */

import { listAllAgents } from "./agent-registry";
import { getServerInstallState } from "./agent-install";
import { getLatestVersion } from "./agent-version";
import type { AgentCatalogItem, MarketplaceCatalog } from "./types";

export interface CatalogFilter {
  query?: string;
  status?: string;
  department?: string;
  tag?: string;
}

export function buildMarketplaceCatalog(filter?: CatalogFilter): MarketplaceCatalog {
  let agents = listAllAgents();

  if (filter?.query) {
    const q = filter.query.toLowerCase();
    agents = agents.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.tags.some((t) => t.includes(q))
    );
  }

  if (filter?.status) {
    agents = agents.filter((a) => a.status === filter.status);
  }

  if (filter?.department) {
    agents = agents.filter((a) => a.department.toLowerCase() === filter.department!.toLowerCase());
  }

  if (filter?.tag) {
    agents = agents.filter((a) => a.tags.includes(filter.tag!.toLowerCase()));
  }

  const catalogItems: AgentCatalogItem[] = agents.map((agent) => ({
    ...agent,
    installState: getServerInstallState(agent.id),
    latestVersion: getLatestVersion(agent.slug) ?? {
      version: agent.version,
      releasedAt: "2026-01-01",
      changelog: "Versión inicial.",
      semver: { major: 1, minor: 0, patch: 0 },
      status: "stable",
    },
  }));

  return {
    agents: catalogItems,
    total: catalogItems.length,
    installed: catalogItems.filter((a) => a.installState === "installed").length,
    available: catalogItems.filter((a) => a.status === "available").length,
    beta: catalogItems.filter((a) => a.status === "beta").length,
  };
}

export function getCatalogDepartments(): string[] {
  return [...new Set(listAllAgents().map((a) => a.department))].sort();
}

export function getCatalogTags(): string[] {
  return [...new Set(listAllAgents().flatMap((a) => a.tags))].sort();
}
