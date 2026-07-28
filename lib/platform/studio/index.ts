/** Studio pillar — public exports. */

export type { StudioSnapshot } from "./types";
export { StudioPillarEngine, studioPillarEngine } from "./engine";
export { listStudioCapabilities, getStudioCapability } from "./registry";
export { portfolioAdapter } from "./adapters/portfolio.adapter";
export { knowledgeAdapter } from "./adapters/knowledge.adapter";
