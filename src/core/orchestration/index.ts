/** PROGRAM 6030 — ORCHESTRATION KERNEL V2 public API. */

export const ORCHESTRATION_KERNEL_VERSION =
  "PROGRAM 6030 — ORCHESTRATION KERNEL V2" as const;

export type * from "./types";
export { ORCHESTRATION_VERSION } from "./types";

export {
  createOrchestrationKernel,
  type CreateMissionInput,
  type CreateKernelOptions,
  type OrchestrationKernel,
} from "./kernel";

export {
  buildCanonicalMissionPlan,
  defaultPolicies,
  type BuildPlanInput,
} from "./planning";

export {
  detectCycles,
  topologicalSort,
  validateWorkflowDag,
  getReadyNodes,
  syncStageStatuses,
  assertValidGraph,
} from "./workflow";

export {
  areNodeDependenciesSatisfied,
  getBlockedReason,
  collectDependents,
} from "./dependencies";

export {
  EXECUTION_MODES,
  assertProductionNeverAutoActivated,
  isNonDestructiveMode,
  shouldAutoAdvance,
  shouldExecuteCapabilities,
  forceDryCapability,
  executeNode,
} from "./execution";

export {
  createParallelismController,
  selectParallelBatch,
  proposeOutputSelection,
  proposeOutputSelectionWithMultiOutput,
  approveOutputSelection,
  activeOutputKinds,
  computeProgress,
} from "./coordination";

export { applyRecovery, type RecoveryRequest, type RecoveryResult } from "./recovery";

export type * from "./snapshots";
export { buildMissionExecutionSnapshot } from "./snapshots";

export {
  isGateBlocking,
  nodeNeedsApproval,
  findPendingApproval,
  grantApproval,
  denyApproval,
  applyApprovalBlocks,
  autoApproveForDryRun,
  createEstimate,
  createDurationEstimate,
  assertNotPresentedAsActual,
  recomputePlanEstimates,
  formatEstimateLabel,
} from "./policies";

export {
  createInMemoryEventBusPort,
  createRuntimeEventBusPort,
  emit,
  createKernelEvent,
  createInMemorySchedulerPort,
  createInMemoryRuntimePort,
  createSchedulerPortFromRuntime,
  createRuntimePortFromEngine,
  fixtureCapabilityResult,
  CapabilityResolverV2,
  createCapabilityResolverV2,
  listResolvableCapabilities,
  FACTORY_ADAPTERS,
  VentureFactoryAdapter,
  BrandFactoryAdapter,
  WebsiteFactoryAdapter,
  ApplicationFactoryAdapter,
  MobileFactoryAdapter,
  BackendFactoryAdapter,
  BuildPipelineAdapter,
  PreviewRuntimeAdapter,
  DeploymentAdapter,
  CodebaseAdapter,
} from "./ports";

export type { KernelEvent, KernelEventType } from "./ports";
