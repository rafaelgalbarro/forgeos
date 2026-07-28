/** PROGRAM 5200 — AI Pair Founder public API. */

export type * from "./types";
export {
  readFounderProfile,
  writeFounderProfile,
  adaptFounderProfileFromInput,
  getFounderProfileRepository,
  profileSummaryForContext,
  DEFAULT_FOUNDER_PROFILE,
} from "./founder-profile";
export {
  readVentureMemory,
  writeVentureMemory,
  hydrateVentureMemory,
  updateMemoryFromMission,
  createEmptyMemory,
} from "./venture-memory";
export {
  detectContradictions,
  reframeReplyForContradictions,
  detectRecommendationRejection,
} from "./contradiction-detector";
export { detectRisks, risksToStatusStrings } from "./risk-advisor";
export { proposeAlternatives } from "./alternative-generator";
export { prioritizeDecisions, topDecisionTitle, buildPriorityList } from "./priority-advisor";
export {
  buildRecommendation,
  buildVentureUnderstanding,
  buildStructuredRecommendations,
  recommendationsToStatusStrings,
} from "./recommendations";
export {
  readFounderPreferences,
  writeFounderPreferences,
  adaptPreferencesFromInput,
} from "./founder-preferences";
export {
  buildPairFounderContext,
  buildHypotheses,
  buildPriorities,
  missionToContext,
} from "./pair-founder-context";
export {
  detectContextChange,
  applyContextChangeToMission,
  explainContextChange,
  isExplicitReviewRequest,
} from "./context-change-handler";
export {
  runPairFounderTurn,
  runPairFounderReview,
  createEmptyCeoInsight,
  getDefaultCeoInsight,
  applyPrioritizedDecisions,
} from "./pair-founder-engine";
