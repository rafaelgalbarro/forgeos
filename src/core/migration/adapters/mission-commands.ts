/**
 * Flow B — Mission commands adapter (ADAPTER_READY).
 * Maps V2 ApplicationCommand names → legacy mission-control command intents.
 */

import { dualWriteService } from "../dual-write";
import { isV2FlagEnabled } from "../feature-flags";
import type { DualWriteResult } from "../types";

export type MissionCommandName =
  | "StartMission"
  | "ApprovePlan"
  | "PauseMission"
  | "ResumeMission"
  | "CancelMission"
  | "SelectOutputs"
  | "StartBuild"
  | "CreatePreview"
  | "CreateRelease"
  | "DeployPreview";

export interface MissionCommandRequest {
  name: MissionCommandName;
  missionId: string;
  requestedBy: string;
  payload?: Record<string, unknown>;
  dryRun?: boolean;
}

export interface MissionCommandHandler {
  handleV2: (cmd: MissionCommandRequest) => Promise<void> | void;
  handleLegacy: (cmd: MissionCommandRequest) => Promise<void> | void;
}

/** Documented mapping — evidence for registry. */
export const MISSION_COMMAND_LEGACY_MAP: Record<MissionCommandName, string> = {
  StartMission: "createNewMission / createInitialMission",
  ApprovePlan: "advancePhase (planning → build) / resolveDecision plan approval",
  PauseMission: "pauseSession",
  ResumeMission: "resumeSession",
  CancelMission: "persistMission status cancelled",
  SelectOutputs: "ensureMissionOutputs / selectOutputsByIntent",
  StartBuild: "executeBuildPipeline / startLiveExecution",
  CreatePreview: "runSandboxBuild / getOrCreateDemoSandboxBuild",
  CreateRelease: "createReleaseManager / buildReleasePackage",
  DeployPreview: "executePreviewDeployment",
};

export async function dispatchMissionCommand(
  cmd: MissionCommandRequest,
  handlers: MissionCommandHandler,
  opts?: { forceDual?: boolean },
): Promise<DualWriteResult> {
  // When commands flag off, dualWriteService already writes legacy only.
  if (!isV2FlagEnabled("ENABLE_V2_COMMANDS") && !opts?.forceDual) {
    return dualWriteService.write({
      component: "mission.commands",
      writeV2: async () => undefined,
      writeLegacy: () => handlers.handleLegacy(cmd),
      forceDual: false,
    });
  }

  return dualWriteService.write({
    component: "mission.commands",
    forceDual: opts?.forceDual,
    writeV2: () => handlers.handleV2(cmd),
    writeLegacy: () => handlers.handleLegacy(cmd),
    repair: () => handlers.handleLegacy(cmd),
  });
}
