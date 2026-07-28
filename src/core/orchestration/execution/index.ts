/** PROGRAM 6030 — Execution barrel. */

export {
  EXECUTION_MODES,
  assertProductionNeverAutoActivated,
  isNonDestructiveMode,
  shouldAutoAdvance,
  shouldExecuteCapabilities,
  forceDryCapability,
} from "./execution-modes";
export { executeNode, type NodeExecutionResult } from "./node-executor";
