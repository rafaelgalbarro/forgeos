export type {
  ForgeIntelligenceReport,
  IntelligenceInput,
  IntelligencePreview,
  IntelligenceRisk,
  IntelligenceOpportunity,
  FounderAdvisorOutput,
  FounderRecommendation,
  LaunchPriority,
  DetectedTag,
} from "./types";

export { generateForgeIntelligenceReport, previewIntelligence } from "./recommendation-engine";
export { scoreLabel } from "./startup-score";
