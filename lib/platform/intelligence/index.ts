/** Intelligence pillar — public exports. */

export type { IntelligenceSnapshot } from "./types";
export { IntelligencePillarEngine, intelligencePillarEngine } from "./engine";
export { listIntelligenceCapabilities, getIntelligenceCapability } from "./registry";
export { intelligenceLayerAdapter } from "./adapters/intelligence-layer.adapter";
