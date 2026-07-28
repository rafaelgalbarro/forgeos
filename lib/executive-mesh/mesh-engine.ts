/** Executive Mesh — Mesh Engine (RC4.9). */

import type { MeshAction, MeshConversationTurn, MeshDepartmentId } from "./types";
import { getDepartment } from "./departments";
import { runCollaborationChain } from "./collaboration-engine";

export type MeshEngineAction = MeshAction | "request_capability" | "vote" | "await_response" | "update_memory";

export interface MeshEngineTurn extends MeshConversationTurn {
  capabilityId?: string;
  awaitingResponse?: boolean;
}

export function runMeshEngine(params: {
  topic: string;
  initiator: MeshDepartmentId;
  capabilityRequest?: { capabilityId: string; action: string };
}): MeshEngineTurn[] {
  const turns: MeshEngineTurn[] = [];
  const collaboration = runCollaborationChain(params.topic);

  for (const turn of collaboration) {
    turns.push({ ...turn });
  }

  if (params.capabilityRequest) {
    const dept = getDepartment(params.initiator);
    turns.push({
      departmentId: params.initiator,
      action: "request_capability",
      message: `${dept?.label ?? params.initiator} solicita capability ${params.capabilityRequest.capabilityId}: ${params.capabilityRequest.action}`,
      capabilityId: params.capabilityRequest.capabilityId,
      confidence: 0.85,
      at: new Date().toISOString(),
    });
    turns.push({
      departmentId: "ceo",
      action: "approve",
      message: `CEO aprueba ejecución de capability ${params.capabilityRequest.capabilityId} vía Capability Resolver`,
      confidence: 0.9,
      at: new Date().toISOString(),
    });
    turns.push({
      departmentId: params.initiator,
      action: "await_response",
      message: "Esperando resultado del Capability Layer…",
      awaitingResponse: true,
      confidence: 0.8,
      at: new Date().toISOString(),
    });
  }

  return turns;
}
