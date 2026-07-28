/** PROGRAM 4700 — Agent detail resolver. */

import { getAgentById, listAllAgents } from "./agent-registry";
import { getAgentRuntimeHints } from "./ai-runtime-adapter";
import { getServerInstallState } from "./agent-install";
import { getLatestVersion, getVersionHistory } from "./agent-version";
import type { AgentDetailView } from "./types";

export function resolveAgentDetail(agentIdOrSlug: string): AgentDetailView | null {
  const agent = getAgentById(agentIdOrSlug);
  if (!agent) return null;

  const latestVersion = getLatestVersion(agent.slug);
  const versions = getVersionHistory(agent.slug);
  const runtimeHints = getAgentRuntimeHints(agent.aiTask, agent.recommendedProvider);

  return {
    ...agent,
    installState: getServerInstallState(agent.id),
    latestVersion: latestVersion ?? {
      version: agent.version,
      releasedAt: "2026-01-01",
      changelog: "Versión inicial.",
      semver: { major: 1, minor: 0, patch: 0 },
      status: "stable",
    },
    versions,
    runtimeHints: {
      realAiEnabled: runtimeHints.realAiEnabled,
      providerConfigured: runtimeHints.providerConfigured,
      suggestedModel: runtimeHints.suggestedModel,
    },
  };
}

export function resolveAgentSlugs(): string[] {
  return listAllAgents().map((a) => a.slug);
}
