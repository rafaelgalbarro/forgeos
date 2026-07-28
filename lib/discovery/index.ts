export type {
  DiscoveryQuestion,
  DiscoveryQuestionType,
  DiscoveryPriority,
  IdeaClassification,
  MissingDecision,
  DefinitionRisk,
  DiscoveryResult,
  DiscoveryInput,
  DiscoveryAnswer,
  DiscoveryAnswerMap,
  AnsweredDiscoveryQuestion,
  DiscoveryContext,
} from "./types";

export {
  saveDiscoveryAnswers,
  getDiscoveryAnswers,
  clearDiscoveryAnswers,
  getOrCreateDraftId,
  migrateDiscoveryAnswers,
} from "./discovery-answers-store";
export {
  buildDiscoveryContext,
  formatDiscoveryContextForPrompt,
  getDiscoveryScoreAdjustment,
  createDiscoveryAnswer,
  countAnsweredQuestions,
} from "./discovery-context";
export { applyDiscoveryToTags, getDiscoveryFounderRecommendations } from "./discovery-intelligence";

export { classifyIdeaDiscovery, C2C_MARKETPLACE_PATTERN, MARKETPLACE_PATTERN } from "./idea-classifier";
export {
  detectMissingDecisions,
  detectAmbiguities,
  detectDefinitionRisks,
  analyzeDecisions,
} from "./decision-detector";
export { generateDiscoveryQuestions } from "./question-generator";
export { calculateDiscoveryScore, scoreLabel as discoveryScoreLabel } from "./discovery-score";
export { runDiscovery, previewDiscovery } from "./discovery-engine";
