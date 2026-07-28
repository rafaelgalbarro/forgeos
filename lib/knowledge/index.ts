export type {
  KnowledgeDomain,
  KnowledgeEntryBase,
  KnowledgeQuery,
  KnowledgeStore,
  WorkerKnowledgeScope,
} from "./types";

export type { ArchitectureEntry, ScalabilityTier } from "./architecture";
export type { BusinessModelEntry, TargetSegment } from "./business-models";
export type { CompetitorEntry } from "./competitors";
export type { FeatureEntry, FeaturePriority } from "./features";
export type { PatternEntry, PatternCategory } from "./patterns";
export type { PricingEntry, PricingStrategy } from "./pricing";
export type { PromptEntry, PromptRole } from "./prompts";
export type { UxEntry, UxPatternType } from "./ux";

export { ARCHITECTURE_CATALOG } from "./architecture";
export { BUSINESS_MODEL_CATALOG } from "./business-models";
export { COMPETITOR_CATALOG } from "./competitors";
export { FEATURE_CATALOG } from "./features";
export { PATTERN_CATALOG } from "./patterns";
export { PRICING_CATALOG } from "./pricing";
export { PROMPT_CATALOG } from "./prompts";
export { UX_CATALOG } from "./ux";

export { knowledgeStore, createKnowledgeStore } from "./knowledge-store";
export {
  createWorkerKnowledgeScope,
  getDefaultDomainsForWorker,
  queryKnowledgeForWorker,
} from "./worker-scope";

export {
  getKnowledgeByDomain,
  searchKnowledge,
  getKnowledgeForWorker,
  getRecommendedPatternsForIdea,
  getTopPatternTitles,
  type IdeaPatternMatch,
  type RecommendedPatternsResult,
} from "./knowledge-queries";

export {
  validateKnowledgeCatalog,
  countByDomain,
  type KnowledgeValidationResult,
} from "./knowledge-validate";
