/** Strategy pillar — public exports. */

export type { StrategyContext, StrategySnapshot } from "./types";
export { StrategyPillarEngine, strategyPillarEngine } from "./engine";
export { listStrategyCapabilities, getStrategyCapability } from "./registry";
export { discoveryAdapter } from "./adapters/discovery.adapter";
export { founderAdvisorAdapter } from "./adapters/founder-advisor.adapter";
export { researchAdapter } from "./adapters/research.adapter";
export { simulatorAdapter } from "./adapters/simulator.adapter";
