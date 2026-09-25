import type {
  AgentConclusion,
  AgentDefinition,
  AgentEcosystemCapabilities,
  AgentMarket,
  AgentRunner,
  AgentSpecialty,
} from "../domain/types";
import { DEFAULT_AGENT_CAPABILITIES } from "../domain/types";
import { createMarketAgentRunners } from "./market-agents";
import { createSpecialtyAgentRunners } from "./specialty-agents";

/**
 * Registry of specialty + market agents.
 * Extends existing analysts — does not fork a parallel committee.
 */
export class AgentEcosystemRegistry {
  private readonly runners = new Map<string, AgentRunner>();
  private readonly capabilities: AgentEcosystemCapabilities;

  constructor(capabilities: Partial<AgentEcosystemCapabilities> = {}) {
    this.capabilities = { ...DEFAULT_AGENT_CAPABILITIES, ...capabilities, mode: "ANALYSIS_ONLY", orderExecution: "disabled", liveTradingEnabled: false, autonomousLive: "LOCKED" };
    for (const runner of createSpecialtyAgentRunners()) {
      this.runners.set(runner.definition.id, runner);
    }
    for (const runner of createMarketAgentRunners({ cryptoAllowed: this.capabilities.cryptoAllowed })) {
      this.runners.set(runner.definition.id, runner);
    }
  }

  listDefinitions(): readonly AgentDefinition[] {
    return [...this.runners.values()].map((r) => r.definition);
  }

  listRunners(filter?: {
    category?: "specialty" | "market";
    specialty?: AgentSpecialty;
    market?: AgentMarket;
    includeSoftDisabled?: boolean;
  }): readonly AgentRunner[] {
    return [...this.runners.values()].filter((runner) => {
      const d = runner.definition;
      if (filter?.category && d.category !== filter.category) return false;
      if (filter?.specialty && d.specialty !== filter.specialty) return false;
      if (filter?.market && d.market !== filter.market) return false;
      if (!filter?.includeSoftDisabled && d.softDisabled) return false;
      return true;
    });
  }

  get(id: string): AgentRunner | undefined {
    return this.runners.get(id);
  }

  getCapabilities(): AgentEcosystemCapabilities {
    return this.capabilities;
  }

  size(): number {
    return this.runners.size;
  }
}

export function createDefaultAgentEcosystem(
  capabilities?: Partial<AgentEcosystemCapabilities>,
): AgentEcosystemRegistry {
  return new AgentEcosystemRegistry(capabilities);
}

export type { AgentConclusion };
