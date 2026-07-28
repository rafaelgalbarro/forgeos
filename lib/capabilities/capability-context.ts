/** ForgeOS Capability Layer — context helpers (RC4.9). */

import type { CapabilityContext, CapabilityRequest } from "./types";
import type { MeshDepartmentId } from "@/lib/executive-mesh/types";

export function buildCapabilityContext(params: {
  ventureId: string;
  requestedBy: MeshDepartmentId;
  action: string;
  approvedBy?: MeshDepartmentId;
  payload?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}): CapabilityContext {
  return {
    ventureId: params.ventureId,
    requestedBy: params.requestedBy,
    approvedBy: params.approvedBy,
    action: params.action,
    payload: params.payload,
    metadata: params.metadata,
  };
}

export function buildCapabilityRequest(params: {
  capabilityId: string;
  ventureId: string;
  requestedBy: MeshDepartmentId;
  action: string;
  approvedBy?: MeshDepartmentId;
  payload?: Record<string, unknown>;
  preferredProvider?: string;
  preferredSkill?: string;
}): CapabilityRequest {
  return {
    capabilityId: params.capabilityId,
    context: buildCapabilityContext({
      ventureId: params.ventureId,
      requestedBy: params.requestedBy,
      action: params.action,
      approvedBy: params.approvedBy,
      payload: params.payload,
    }),
    preferredProvider: params.preferredProvider,
    preferredSkill: params.preferredSkill,
  };
}
