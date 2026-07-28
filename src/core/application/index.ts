/**
 * Program 6020 — Application Command / Query Layer
 *
 * Mutations via Commands; UI reads via Queries + snapshots/read models.
 * Depends on compat-domain stubs and ports — not React, not Runtime.
 * PROGRAM 6050 adds delivery-commands (pipeline) without replacing 6020 buses.
 */

// CQ layer — explicit paths so flat legacy modules cannot shadow folders
export * from "./commands/bus";
export * from "./commands/types";
export {
  COMMAND_TYPES,
  type ApproveCodebaseCommand,
  type ApproveDeploymentCommand,
  type ApproveMissionPlanCommand,
  type ApproveOutputCommand,
  type ApproveReleaseCommand,
  type CancelMissionCommand,
  type CommandType,
  type CreateMissionCommand,
  type CreatePreviewCommand,
  type CreateReleaseCommand,
  type CreateVentureCommand,
  type CreateWorkspaceCommand,
  type GenerateCodebaseCommand,
  type GenerateOutputCommand,
  type PauseMissionCommand,
  type PlanOutputCommand,
  type RequestCodeChangeCommand,
  type RequestDecisionCommand,
  type RequestDeploymentCommand,
  type RequestOutputChangeCommand,
  type ResolveDecisionCommand,
  type ResumeMissionCommand,
  type RetryBuildCommand,
  type RollbackDeploymentCommand,
  type StartBuildCommand,
  type StopBuildCommand,
  type StopPreviewCommand,
  type UpdateMissionIntentCommand,
  /** CQ envelope union (legacy flat `ApplicationCommand` is exported below). */
  type ApplicationCommand as CqApplicationCommand,
} from "./commands/definitions";
export * from "./queries/bus";
export * from "./queries/types";
export * from "./queries/definitions";
export * from "./ports/index";
export * from "./errors";
export * from "./policies";
export * from "./dto";
export * from "./mappers";
export * from "./services";
export * from "./handlers";
export * from "./testing/in-memory";
export * from "./compat-domain";

// Legacy flat stubs (no clash with ExecuteCommandResult / ExecuteQueryResult)
export type {
  ApplicationCommandName,
  ApplicationCommand,
  CommandResult,
} from "./kernel-commands";
export type { ApplicationCommandBus } from "./legacy-command-port";
export type {
  ApplicationQueryName,
  LegacyApplicationQuery,
  LegacyQueryResult,
} from "./legacy-queries";

export * from "./command-bridges";
export * from "./experience-snapshots";
export * from "./value-engine";
export {
  dispatchDeliveryCommand,
  type DeliveryCommand,
  type DeliveryCommandName,
  type DeliveryCommandResult,
} from "./delivery-commands";

export * from "./company-dashboard";
export * from "./value-engine";
export * from "./venture-ceo";
export * from "./portfolio";
export * from "./portfolio-command-center";
