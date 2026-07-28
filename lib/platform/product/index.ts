/** Product pillar — public exports. */

export type { ProductModuleId, ProductSnapshot } from "./types";
export { ProductPillarEngine, productPillarEngine } from "./engine";
export { listProductCapabilities, getProductCapability } from "./registry";
export { prdAdapter } from "./adapters/prd.adapter";
export { roadmapAdapter } from "./adapters/roadmap.adapter";
export { uxAdapter } from "./adapters/ux.adapter";
