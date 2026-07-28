/**
 * ForgeOS V2 — Canonical Domain Model (PROGRAM 6010)
 *
 * Folder modules are the official aggregates. Application Program 6020 uses
 * `src/core/application/compat-domain` for transitional functional stubs.
 */

export * from "./shared";
export type {
  PlanId,
  NodeId,
  StageId,
  EstimateKind,
  CostEstimate,
  DurationEstimate,
  DepartmentId,
} from "./types";
export * from "./capabilities";

export * from "./workspace/index";
export * from "./portfolio/index";
export * from "./founder";
export * from "./venture/index";
export * from "./mission/index";
export * from "./decision/index";
export * from "./artifact";
export * from "./product";
export * from "./output/index";
export * from "./codebase/index";
export * from "./build/index";
export * from "./preview";
export * from "./release";
export * from "./deployment";
export * from "./operation";
export * from "./evolution";
export * from "./events/index";
export * from "./value/index";
export * from "./venture-ceo/index";

export type {
  WorkspaceRepository,
  VentureRepository,
  MissionRepository,
  DecisionRepository,
  ArtifactRepository,
  ProductRepository,
  OutputRepository,
  CodebaseRepository,
  BuildRepository,
  PreviewRepository,
  ReleaseRepository,
  DeploymentRepository,
} from "./ports";
export type { ValueEngineRepository } from "./value/repository";
