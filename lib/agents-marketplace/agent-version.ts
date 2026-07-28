/** PROGRAM 4700 — Agent version history (semver per agent). */

import type { AgentVersion } from "./types";
import { getAgentById } from "./agent-registry";

function parseSemver(version: string): AgentVersion["semver"] {
  const [major = "1", minor = "0", patch = "0"] = version.split(".");
  return { major: Number(major), minor: Number(minor), patch: Number(patch) };
}

const VERSION_HISTORY: Record<string, AgentVersion[]> = {
  ceo: [
    { version: "1.0.0", releasedAt: "2026-01-15", changelog: "Lanzamiento inicial — brief ejecutivo y análisis de riesgo.", semver: parseSemver("1.0.0"), status: "stable" },
    { version: "0.9.0", releasedAt: "2025-12-01", changelog: "Beta — integración con executive mesh.", semver: parseSemver("0.9.0"), status: "deprecated" },
  ],
  cto: [
    { version: "1.0.0", releasedAt: "2026-01-15", changelog: "Lanzamiento inicial — arquitectura y revisión técnica.", semver: parseSemver("1.0.0"), status: "stable" },
  ],
  cfo: [
    { version: "1.0.0", releasedAt: "2026-02-01", changelog: "Lanzamiento inicial — modelado financiero y pricing.", semver: parseSemver("1.0.0"), status: "stable" },
  ],
  cmo: [
    { version: "1.0.0", releasedAt: "2026-01-20", changelog: "Lanzamiento inicial — posicionamiento y campañas.", semver: parseSemver("1.0.0"), status: "stable" },
  ],
  coo: [
    { version: "1.0.0", releasedAt: "2026-02-10", changelog: "Lanzamiento inicial — operaciones y coordinación.", semver: parseSemver("1.0.0"), status: "stable" },
  ],
  research: [
    { version: "1.0.0", releasedAt: "2026-01-10", changelog: "Lanzamiento inicial — investigación de mercado.", semver: parseSemver("1.0.0"), status: "stable" },
    { version: "1.1.0", releasedAt: "2026-03-01", changelog: "Mejora en análisis competitivo y tendencias.", semver: parseSemver("1.1.0"), status: "beta" },
  ],
  marketing: [
    { version: "1.0.0", releasedAt: "2026-01-25", changelog: "Lanzamiento inicial — copy y SEO.", semver: parseSemver("1.0.0"), status: "stable" },
  ],
  legal: [
    { version: "1.0.0", releasedAt: "2026-02-05", changelog: "Lanzamiento inicial — RGPD y contratos.", semver: parseSemver("1.0.0"), status: "stable" },
  ],
  sales: [
    { version: "0.8.0", releasedAt: "2026-03-15", changelog: "Beta — pipeline CRM y propuestas.", semver: parseSemver("0.8.0"), status: "beta" },
  ],
  support: [
    { version: "0.7.0", releasedAt: "2026-03-20", changelog: "Beta — tickets y FAQ automatizado.", semver: parseSemver("0.7.0"), status: "beta" },
  ],
  developer: [
    { version: "1.0.0", releasedAt: "2026-01-30", changelog: "Lanzamiento inicial — código y PRs.", semver: parseSemver("1.0.0"), status: "stable" },
  ],
  qa: [
    { version: "0.9.0", releasedAt: "2026-03-10", changelog: "Beta — plan de pruebas y regresión.", semver: parseSemver("0.9.0"), status: "beta" },
  ],
  data: [
    { version: "1.0.0", releasedAt: "2026-02-15", changelog: "Lanzamiento inicial — métricas y dashboards.", semver: parseSemver("1.0.0"), status: "stable" },
  ],
};

export function getVersionHistory(agentIdOrSlug: string): AgentVersion[] {
  const agent = getAgentById(agentIdOrSlug);
  if (!agent) return [];
  const history = VERSION_HISTORY[agent.slug] ?? [];
  if (history.length === 0) {
    return [{
      version: agent.version,
      releasedAt: "2026-01-01",
      changelog: "Versión inicial del catálogo.",
      semver: parseSemver(agent.version),
      status: "stable",
    }];
  }
  return [...history].sort((a, b) => {
    if (a.semver.major !== b.semver.major) return b.semver.major - a.semver.major;
    if (a.semver.minor !== b.semver.minor) return b.semver.minor - a.semver.minor;
    return b.semver.patch - a.semver.patch;
  });
}

export function getLatestVersion(agentIdOrSlug: string): AgentVersion | undefined {
  return getVersionHistory(agentIdOrSlug)[0];
}

export function compareVersions(a: string, b: string): number {
  const pa = parseSemver(a);
  const pb = parseSemver(b);
  if (pa.major !== pb.major) return pa.major - pb.major;
  if (pa.minor !== pb.minor) return pa.minor - pb.minor;
  return pa.patch - pb.patch;
}
