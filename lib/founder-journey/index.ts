export type {
  JourneyPhaseId,
  JourneyPhaseStatus,
  JourneyBlocker,
  JourneyNextAction,
  JourneyPhaseDefinition,
  JourneyPhaseState,
  JourneySummary,
  FounderJourneySnapshot,
  JourneyTimelineEntry,
  JourneyStoreState,
  BlockerSeverity,
  FounderOnboardingStepId,
  FounderOnboardingStep,
  FounderProfileData,
  FounderCompanyData,
  FounderMarketData,
  FounderVentureData,
  FounderCeoBriefingData,
  FounderOnboardingState,
  FounderJourneyMilestoneId,
  FounderJourneyMilestone,
  FounderJourneyProgress,
  WelcomeDashboardData,
  CeoWelcomeContent,
  FounderJourneyCompletionResult,
} from "./types";

export { FOUNDER_JOURNEY_PHASES, getPhaseDefinition } from "./phases";

export {
  computeJourneyPhases,
  computeJourneySummary,
  computeFounderJourney,
} from "./journey-engine";

export {
  buildJourneyTimeline,
  groupTimelineByMilestone,
  computeUserPipelineProgress,
  USER_PIPELINE_GROUPS,
} from "./journey-timeline";

export {
  getJourneyStoreState,
  setSelectedPhase,
  setJourneyVenture,
  resolveJourneyVenture,
} from "./journey-store";

export {
  FOUNDER_ONBOARDING_STEPS,
  getFounderOnboardingState,
  isFounderOnboardingComplete,
  getFounderStepIndex,
  getNextFounderStep,
  getPrevFounderStep,
  goToFounderStep,
  advanceFounderOnboarding,
  completeFounderOnboarding,
  resetFounderOnboarding,
  validateFounderStep,
} from "./onboarding-wizard";

export {
  FOUNDER_JOURNEY_MILESTONES,
  getCompletedMilestones,
  markMilestoneComplete,
  computeJourneyProgress,
  getMilestoneById,
} from "./progress-tracker";

export { buildWelcomeDashboard } from "./welcome-dashboard";
export { buildCeoWelcomeContent, buildCeoBriefingPriorities } from "./ceo-welcome";
export { seedInitialTimeline } from "./initial-timeline";
export { seedInitialKnowledge } from "./initial-knowledge";
export { seedInitialMemory } from "./initial-memory";

export {
  getJourneyEntryRoute,
  getPostOnboardingRoute,
  getPostWorkspaceRoute,
  syncProfileFromOnboarding,
  finalizeFounderJourney,
  prepareCeoBriefingStep,
  markJourneyMilestoneFromPath,
} from "./journey-manager";

export {
  LEGACY_ROUTE_REDIRECTS,
  resolveLegacyRedirect,
  getUnifiedJourneyLinks,
} from "./redirects";
