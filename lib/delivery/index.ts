/**
 * ForgeOS 2030.1 — Program Governance & Delivery System.
 * NOT wired into app routes — governance layer only.
 */

export type {
  DeliveryReport,
  EpicRecord,
  ReleaseRecord,
  ReleaseSpec,
  QualityGate,
  QualityGateId,
  QualityGateResult,
  RoadmapStatus,
  RoadmapProgramStatus,
  RoadmapPillarStatus,
  ScaffoldModuleRef,
  ScaffoldConnectionPolicy,
  ForbiddenImportRule,
} from "./types";

export {
  registerEpic,
  getEpic,
  listEpics,
  listEpicsByProgram,
  assignEpicToProgram,
  clearEpicRegistry,
} from "./epic-registry";

export {
  registerRelease,
  getRelease,
  listReleases,
  listReleasesByEpic,
  linkFeaturesToRelease,
  divideEpicIntoReleases,
  clearReleaseRegistry,
} from "./release-registry";

export {
  createDeliveryReport,
  validateDeliveryReport,
  formatDeliveryReportMarkdown,
} from "./delivery-report";

export {
  QUALITY_GATES,
  CRITICAL_ROUTES,
  OPTIONAL_ROUTES,
  FORBIDDEN_IMPORT_RULES,
  runBuildGate,
  runResetDevGate,
  runCriticalRoutesGate,
  checkForbiddenImportsInPaths,
  runNoHeavyBarrelsGate,
  runNoLogicInComponentsGate,
  runFhisNewUiGate,
  scaffoldConnectionGate,
  getQualityGate,
  evaluateQualityGates,
} from "./quality-gates";

export {
  getRoadmapStatus,
  getScaffoldModules,
  getDisconnectedModules,
  canConnectModule,
  getScaffoldConnectionPolicy,
} from "./roadmap-status";
