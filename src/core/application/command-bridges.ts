/**
 * PROGRAM 6060 — Thin UI command bridges over Commands V2 (6020 definitions).
 * Dry-run by default; navigates without loading engines on the client.
 */

export type ExperienceCommandName =
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

/** Maps experience actions → 6020 command type names (for telemetry / future bus). */
export const EXPERIENCE_TO_V2_COMMAND: Record<ExperienceCommandName, string> = {
  CreateVenture: "CreateVenture",
  StartMission: "CreateMission",
  OpenStudio: "PlanOutput",
  RequestChange: "RequestOutputChange",
  StartBuild: "StartBuild",
  CreatePreview: "CreatePreview",
  CreateRelease: "CreateRelease",
  DeployPreview: "RequestDeployment",
  ReviewCompany: "CreateVenture",
  PauseMission: "PauseMission",
  ApprovePlan: "ApproveMissionPlan",
  SelectOutputs: "PlanOutput",
  ResumeMission: "ResumeMission",
  CancelMission: "CancelMission",
};

export interface ExperienceCommandRequest {
  name: ExperienceCommandName;
  missionId?: string;
  ventureId?: string;
  requestedBy?: string;
  payload?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface ExperienceCommandOutcome {
  ok: boolean;
  command: string;
  v2Command: string;
  missionId: string;
  message: string;
  href?: string;
  data?: Record<string, unknown>;
}

/** Resolve palette / UI actions to Commands V2 results + optional navigation. */
export function dispatchExperienceCommand(
  req: ExperienceCommandRequest
): ExperienceCommandOutcome {
  const missionId = req.missionId ?? "pending";
  const dry = req.dryRun !== false;
  const v2Command = EXPERIENCE_TO_V2_COMMAND[req.name];

  switch (req.name) {
    case "CreateVenture":
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: dry ? "Dry-run: CreateVenture → Creator" : "Create Venture",
        href: "/os/creator",
      };
    case "StartMission":
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: dry ? "Dry-run: CreateMission → Mission Control" : "Mission started",
        href: "/mission-control",
      };
    case "OpenStudio":
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: "Open Studio",
        href: missionId !== "pending" ? `/studio/${missionId}` : "/studio",
      };
    case "RequestChange":
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: dry ? "Dry-run: RequestOutputChange" : "Change requested",
        href: missionId !== "pending" ? `/studio/${missionId}` : "/studio",
      };
    case "StartBuild":
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: dry ? "Dry-run: StartBuild (sin Build Runtime en cliente)" : "Build queued",
        href: missionId !== "pending" ? `/studio/${missionId}/build` : "/build",
      };
    case "CreatePreview":
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: dry ? "Dry-run: CreatePreview" : "Preview created",
        href: missionId !== "pending" ? `/studio/${missionId}/preview` : "/studio",
      };
    case "CreateRelease":
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: dry ? "Dry-run: CreateRelease" : "Release created",
        href: missionId !== "pending" ? `/studio/${missionId}/release` : "/studio",
      };
    case "DeployPreview":
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: dry ? "Dry-run: RequestDeployment (sin providers en cliente)" : "Deploy preview",
        href: missionId !== "pending" ? `/studio/${missionId}/deployment` : "/deployments",
      };
    case "ReviewCompany": {
      const ventureId = req.ventureId ?? "demo";
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: "Review Company OS",
        href: `/company/${ventureId}`,
        data: { ventureId },
      };
    }
    case "PauseMission":
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: dry ? "Dry-run: PauseMission" : "Mission paused",
        href: missionId !== "pending" ? `/missions/${missionId}` : "/mission-control",
      };
    default:
      return {
        ok: true,
        command: req.name,
        v2Command,
        missionId,
        message: dry ? `Dry-run: ${v2Command}` : v2Command,
        href: missionId !== "pending" ? `/missions/${missionId}` : "/mission-control",
      };
  }
}
