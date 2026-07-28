/** PROGRAM 5100/5300 — Mission Control public API (coordinator only). */

export type * from "./types";
export { MISSION_CONTROL_VERSION } from "./types";

export { buildMissionControlSnapshot, DEFAULT_SNAPSHOT_ITEMS } from "./mission-snapshots";
export { classifyFromCard, classifyUserInput, ceoClarifyingVoice, classifyMissionIntent, formatCeoIntentionExplanation } from "./intention-engine";
export {
  getNextDiscoveryQuestion,
  generateOpportunities,
  isDiscoveryComplete,
  DISCOVERY_QUESTIONS,
} from "./discovery-mode";
export { resolveFactoryRoute, routeToFactory, factoryProgressSteps } from "./smart-routing";
export {
  MISSION_PHASE_ORDER,
  createInitialMission,
  advancePhase,
  setIntention,
  phaseLabelEs,
  snapshotsForIntention,
  isGTMPhase,
  gtmSubStepLabel,
  GTM_TRIGGER_PHASES,
  shouldAutoTriggerGTM,
} from "./mission-flow";
export {
  processConversationTurn,
  handleCardSelection,
  handleUserMessage,
  resolveDecisionById,
  initializeMissionSession,
} from "./conversation-engine";
export {
  startLiveExecution,
  advanceExecutionStep,
  executionProgressPercent,
  isExecutionComplete,
} from "./live-execution";
export {
  appendTimelineEvent,
  timelineForIdeaRegistered,
  timelineForPhaseAdvance,
  timelineForUserMessage,
  timelineForCeoResponse,
} from "./mission-timeline";
export {
  ensureLiveMission,
  emitMissionEvent,
  emitMissionEventAsync,
  syncLiveMissionFromMission,
  advanceLiveMissionQueue,
  buildLiveMissionSnapshot,
} from "./live-mission";
export {
  buildSerializableSnapshot,
  useLiveMissionSnapshot,
  retryFailedTask,
  getLiveMissionSnapshot,
} from "@/lib/live-mission";
export {
  shouldShowExecutiveCouncil,
  fetchExecutiveSummary,
  runExecutiveBoardForMission,
  buildFallbackCouncilSummary,
  executiveBannerMessage,
} from "./executive-orchestration";
export {
  shouldTriggerExecutiveBoard,
  primaryBoardTrigger,
} from "./executive-board/board-trigger";
export type {
  ExecutiveBoardSession,
  ExecutiveSummary,
  DepartmentReview,
  BoardTriggerReason,
} from "./executive-board/types";
export {
  getPendingDecisions,
  getNextPendingDecision,
  resolveDecision,
  seedDecisionsForIntention,
  createDecision,
  formatDecisionPrompt,
} from "./decision-center";
export { setAutoPilot, autoResolveIfAllowed, shouldPauseForDecision, autoPilotLabel, ensureAutonomousState, setAutonomousBuild, autonomousBuildLabel } from "./auto-pilot";
export {
  readAllMissions,
  saveMission,
  createNewMission,
  getMissionById,
  getActiveMissionId,
  setActiveMissionId,
  getMissionCount,
  ensureSnapshots,
  mergeDecisionLog,
  readAutonomousState,
  saveAutonomousState,
} from "./mission-persistence";
export {
  getMissionRepository,
  loadOrCreateSession,
  persistMission,
  loadMission,
} from "./mission-repository";
export {
  createMissionSession,
  missionToSession,
  sessionToMission,
  pauseSession,
  resumeSession,
  updateSessionIntent,
  addSessionMessage,
  attachArtifact,
  setSessionPhase,
  nextUnderstandingTopic,
  isUnderstandingComplete,
  UNDERSTANDING_TOPICS,
} from "./mission-session";
export {
  runStageAdvance,
  phaseToSessionStatus,
  sessionStatusToPhase,
  runnerProgressPercent,
  nextStageHint,
} from "./mission-runner";
export { runValidationPhase, formatValidationScores } from "./mission-validator";
export { generateMissionPlan, planProgress } from "./mission-plan";
export {
  appendHistoryEntry,
  readMissionHistory,
  historySummary,
} from "./mission-history";
export {
  AUTONOMOUS_BUILD_VERSION,
  createAutonomousState,
  tickAutonomous,
  buildPanelView,
  pauseAutonomousLoop,
  handleApprovalResponse,
  resumeAutonomous,
  requiresApproval,
  approvalReasonLabel,
} from "./autonomous-build";
export { subscribeLiveMissionEvents, emitAutonomousMissionEvent } from "./live-mission/event-emitter";
export {
  runPairFounderTurn,
  runPairFounderReview,
  createEmptyCeoInsight,
  getDefaultCeoInsight,
  applyPrioritizedDecisions,
} from "./pair-founder";
export {
  detectGTMIntent,
  generateGTMPackage,
  generateGTMPackageAsync,
  readGTMPackage,
  buildEmptyGTMSnapshot,
  buildGTMSnapshotFromPackage,
  gtmSnapshotSummary,
  GTM_PROGRAM_VERSION,
  GTM_DELIVERABLE_LABELS,
} from "./go-to-market";
export type * from "./investor-mode";
export {
  INVESTOR_MODE_VERSION,
  buildInvestorModeSnapshot,
  generateInvestorPackage,
  readInvestorPackage,
  detectInvestorIntent,
  investorReadinessLabel,
} from "./investor-mode";
export {
  DIGITAL_CEO_VERSION,
  startMissionSession,
  composeAllBriefs,
  dismissDigitalCEO,
  buildEmptyDigitalCEOSnapshot,
  getDigitalCEOSnapshotForMission,
} from "./digital-ceo";
export type { ProactiveCEOState, DigitalCEOBriefs, MorningBrief, CEOBrief } from "./digital-ceo";
export {
  AUTONOMOUS_COMPANY_VERSION,
  shouldShowCompanyWorkspaces,
  activateOperatePhase,
  activateEvolvePhase,
  buildCompanyWorkspacesSeed,
  buildCompanyWorkspacesSnapshot,
  COMPANY_WORKSPACES,
} from "./autonomous-company";
export type {
  CompanyWorkspacesSnapshot,
  CompanyWorkspaceId,
  KPISnapshot,
  NPSData,
  BacklogItem,
  Incident,
  RoadmapItem,
  FeedbackItem,
} from "./autonomous-company";
export type * from "./exit-strategy";
export {
  EXIT_STRATEGY_VERSION,
  EXIT_STRATEGIES,
  EXIT_STRATEGY_ORDER,
  readExitStrategySelection,
  selectExitStrategy,
  orchestrateExitStrategyChange,
  shouldShowExitStrategy,
  buildExitMetrics,
  buildExitStrategySnapshot,
  computeExitReadiness,
  computeStrategicAlignment,
  computeDecisionImpacts,
  getExitStrategyLabel,
  detectExitStrategyIntent,
} from "./exit-strategy";
