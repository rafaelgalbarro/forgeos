/** Strategy pillar — type contracts. */

import type { VentureId } from "../shared/types";

export interface StrategyModuleId {
  discovery: "discovery";
  founderAdvisor: "founder-advisor";
  research: "research";
  simulator: "simulator";
}

export interface StrategyContext {
  ventureId: VentureId;
  hasDiscovery: boolean;
  hasResearch: boolean;
  hasSimulation: boolean;
}

export interface StrategySnapshot {
  ventureId: VentureId;
  modules: string[];
  updatedAt: string;
}
