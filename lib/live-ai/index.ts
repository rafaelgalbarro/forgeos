/** ForgeOS Live AI — RC5.5 simulation + RC6 real AI telemetry. */

export * from "./types";
export {
  isStartupCommand,
  createInitialSimulationState,
  LiveAiSimulationEngine,
} from "./simulation-engine";
export { buildLiveAiRuntimeSnapshot } from "./runtime-bridge";
export type { LiveAiRuntimeSnapshot } from "./runtime-bridge";
export { buildLiveAiSnapshot } from "./snapshot";
export type { LiveAiSnapshot, LiveDepartmentStatus } from "./snapshot";
