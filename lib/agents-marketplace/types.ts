/** PROGRAM 4700 — AI Agents Marketplace types. */

import type { RuntimeProviderId } from "@/lib/ai-runtime/types";
import type { AITask } from "@/lib/ai-gateway/types";

export type AgentStatus = "available" | "installed" | "beta" | "coming-soon" | "deprecated";

export type InstallState = "not-installed" | "installing" | "installed" | "uninstalling";

export interface AgentCapability {
  id: string;
  label: string;
  description: string;
  category: "strategy" | "operations" | "analysis" | "execution" | "governance";
}

export interface AgentVersion {
  version: string;
  releasedAt: string;
  changelog: string;
  semver: { major: number; minor: number; patch: number };
  status: "stable" | "beta" | "deprecated";
}

export interface RegistryEntry {
  skillId: string;
  skillName: string;
  category: string;
  usage: "primary" | "secondary" | "optional";
}

export interface MarketplaceAgent {
  id: string;
  slug: string;
  name: string;
  role: string;
  description: string;
  capabilities: AgentCapability[];
  skills: RegistryEntry[];
  estimatedCostPerMonth: number;
  estimatedCostPerCall: number;
  recommendedProvider: RuntimeProviderId;
  recommendedModel?: string;
  aiTask: AITask;
  version: string;
  status: AgentStatus;
  department: string;
  icon: string;
  tags: string[];
}

export interface AgentCatalogItem extends MarketplaceAgent {
  installState: InstallState;
  latestVersion: AgentVersion;
}

export interface AgentDetailView extends AgentCatalogItem {
  versions: AgentVersion[];
  runtimeHints: {
    realAiEnabled: boolean;
    providerConfigured: boolean;
    suggestedModel?: string;
  };
}

export interface MarketplaceCatalog {
  agents: AgentCatalogItem[];
  total: number;
  installed: number;
  available: number;
  beta: number;
}

export interface InstallRecord {
  agentId: string;
  installedAt: string;
  version: string;
}

export interface InstallStore {
  records: InstallRecord[];
  updatedAt: string;
}
