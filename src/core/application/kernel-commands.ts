/**
 * Orchestration kernel command contracts (PROGRAM 6030).
 * Separate from ./commands/ CQ bus to avoid module path collisions.
 */

export type KernelCommandName =
  | "CreateVenture"
  | "StartMission"
  | "OpenStudio"
  | "RequestChange"
  | "StartBuild"
  | "CreatePreview"
  | "CreateRelease"
  | "DeployPreview"
  | "ReviewCompany"
  | "PauseMission"
  | "ApprovePlan"
  | "SelectOutputs"
  | "ResumeMission"
  | "CancelMission";

export interface KernelApplicationCommand {
  name: KernelCommandName;
  missionId: string;
  requestedBy?: string;
  payload?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface KernelCommandResult {
  ok: boolean;
  command: KernelCommandName | string;
  missionId: string;
  message: string;
  data?: Record<string, unknown>;
}

/** Aliases used by orchestration kernel */
export type ApplicationCommand = KernelApplicationCommand;
export type CommandResult = KernelCommandResult;
export type ApplicationCommandName = KernelCommandName;
