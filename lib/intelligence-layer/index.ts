/** Forge Intelligence Layer — public API (Release 0.5). */

export type {
  Decision,
  DecisionStatus,
  TimelineNode,
  TimelinePhase,
  Pattern,
  PatternType,
  Insight,
  InsightCategory,
  Recommendation,
  RecommendationPriority,
  LearningSnapshot,
  VentureMemoryRecord,
  PortfolioMemory,
  HistoricalEvent,
  IntelligenceMetrics,
  CeoMemory,
  CeoBriefing,
  CeoPriority,
  CeoResult,
} from "./types";

export { STORAGE_KEYS } from "./memory/types";
export { readStorage, writeStorage } from "./memory/storage";

export {
  buildVentureMemory,
  syncVentureMemory,
  getVentureMemory,
  getAllVentureMemories,
} from "./venture-memory";

export { buildPortfolioMemory, getPortfolioMemory } from "./portfolio-memory";

export {
  registerDecision,
  getDecisionsForVenture,
  getDecisionById,
  updateDecision,
  autoRegisterMilestoneDecisions,
  getAllDecisions,
} from "./decision-engine";

export {
  recordVentureHistoryEvent,
  getHistoryForVenture,
  getAllHistory,
} from "./history";

export { buildVentureTimeline } from "./timeline";

export {
  detectPatterns,
  getCachedPatterns,
  getPatternsForVenture,
  getPatternTypeLabel,
} from "./pattern-engine";

export {
  updateLearningFromVenture,
  getLearningForVenture,
  getAllLearning,
} from "./learning-engine";

export { computeIntelligenceMetrics, getMetricsSummary } from "./metrics";

export { generateInsights, getInsightsForVenture } from "./insights";

export { generateRecommendations } from "./recommendations";

export {
  getCeoMemory,
  saveCeoMemory,
  addCeoBriefing,
  addCeoPriority,
  addCeoResult,
  storeCeoRecommendations,
  updateCeoPriorityStatus,
} from "./ceo-memory";

export {
  wrapKnowledgeEntry,
  getEvolvedKnowledgeMeta,
  getAllEvolvedKnowledge,
  invalidateKnowledge,
  isKnowledgeValid,
  getKnowledgeByPriority,
  linkKnowledgeToVenture,
  type EvolvedKnowledgeMeta,
  type KnowledgeOrigin,
} from "./knowledge-evolution";
