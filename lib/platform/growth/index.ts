/** Growth pillar — public exports. */

export type {
  GrowthModuleId,
  CacMetrics,
  LtvMetrics,
  FunnelStage,
  Experiment,
  CrmContact,
  GrowthSnapshot,
} from "./types";
export { GrowthPillarEngine, growthPillarEngine } from "./engine";
export { listGrowthCapabilities, getGrowthCapability } from "./registry";
