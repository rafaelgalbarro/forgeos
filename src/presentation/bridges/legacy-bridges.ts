/**
 * Legacy bridges — progressive adapters for Mission Control / Build / Preview / Deployment.
 * Preserve compatibility: legacy routes keep working; wrappers call V2 where feasible.
 *
 * Status:
 * - Mission Control: bridge helpers available; app/actions/mission-control.ts NOT deleted.
 * - Creation Output / Build / Preview / Deployment: documented stubs that map intents → V2 commands.
 */

import type { CommandBus } from "@/src/core/application";

export interface LegacyBridgeResult {
  bridged: boolean;
  commandType?: string;
  note: string;
  result?: unknown;
}

/** Optional V2 path for mission create from legacy Mission Control callers. */
export async function bridgeCreateMission(
  commandBus: CommandBus,
  input: {
    actorId: string;
    workspaceId: string;
    idea?: string;
    commandId?: string;
    idempotencyKey?: string;
  },
): Promise<LegacyBridgeResult> {
  const result = await commandBus.execute({
    type: "CreateMission",
    payload: {
      workspaceId: input.workspaceId,
      idea: input.idea,
    },
    meta: {
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      commandId: input.commandId,
      idempotencyKey: input.idempotencyKey,
    },
  });
  return {
    bridged: true,
    commandType: "CreateMission",
    note: "Legacy Mission Control can call this bridge instead of mutating repositories directly.",
    result,
  };
}

export async function bridgeStartBuild(
  commandBus: CommandBus,
  input: {
    actorId: string;
    workspaceId: string;
    missionId: string;
    commandId?: string;
    idempotencyKey?: string;
  },
): Promise<LegacyBridgeResult> {
  const result = await commandBus.execute({
    type: "StartBuild",
    payload: { workspaceId: input.workspaceId, missionId: input.missionId },
    meta: {
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      commandId: input.commandId,
      idempotencyKey: input.idempotencyKey,
    },
  });
  return {
    bridged: true,
    commandType: "StartBuild",
    note: "Maps legacy build-start intent to V2 StartBuild command.",
    result,
  };
}

export async function bridgeCreatePreview(
  commandBus: CommandBus,
  input: {
    actorId: string;
    workspaceId: string;
    missionId: string;
    commandId?: string;
    idempotencyKey?: string;
  },
): Promise<LegacyBridgeResult> {
  const result = await commandBus.execute({
    type: "CreatePreview",
    payload: { workspaceId: input.workspaceId, missionId: input.missionId },
    meta: {
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      commandId: input.commandId,
      idempotencyKey: input.idempotencyKey,
    },
  });
  return {
    bridged: true,
    commandType: "CreatePreview",
    note: "Maps legacy preview-runtime start to V2 CreatePreview. app/actions/preview-runtime.ts unchanged.",
    result,
  };
}

export async function bridgeRequestDeployment(
  commandBus: CommandBus,
  input: {
    actorId: string;
    workspaceId: string;
    missionId: string;
    target: "preview" | "staging" | "production";
    releaseId?: string;
    commandId?: string;
    idempotencyKey?: string;
  },
): Promise<LegacyBridgeResult> {
  const result = await commandBus.execute({
    type: "RequestDeployment",
    payload: {
      workspaceId: input.workspaceId,
      missionId: input.missionId,
      target: input.target,
      releaseId: input.releaseId,
    },
    meta: {
      actorId: input.actorId,
      workspaceId: input.workspaceId,
      commandId: input.commandId,
      idempotencyKey: input.idempotencyKey,
    },
  });
  return {
    bridged: true,
    commandType: "RequestDeployment",
    note:
      input.target === "production"
        ? "Production deploy is policy-denied by default (governance)."
        : "Maps legacy preview-deployment request to V2 RequestDeployment.",
    result,
  };
}

/** Creation Output bridge stub — wires PlanOutput / GenerateOutput when callers migrate. */
export function bridgeCreationOutputNote(): LegacyBridgeResult {
  return {
    bridged: false,
    note: "Creation Output engines remain in lib/creation-output. Prefer PlanOutput/GenerateOutput/ApproveOutput commands from new UI paths.",
  };
}
