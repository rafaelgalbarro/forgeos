export { buildAIContext, contextBlocksToPromptSection } from "./context-engine";
export type { BuiltAIContext } from "./context-engine";
export {
  buildContextV2,
  buildExecutiveContext,
  buildDepartmentContext,
  buildCapabilityContext,
  buildSkillContext,
  buildExecutionContext,
} from "./v2";
export type { ContextV2Input, BuiltContextV2, ContextLayer } from "./v2";
