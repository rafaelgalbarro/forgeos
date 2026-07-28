/** ForgeOS Capability Layer — adapters: executive mesh (RC4.9). */

import { runCapabilityRequest } from "../pipeline";
import type { CapabilityRequest, CapabilityResult } from "../types";
import type { MeshDepartmentId } from "@/lib/executive-mesh/types";

export interface MeshCapabilityRequest {
  capabilityId: string;
  ventureId: string;
  requestedBy: MeshDepartmentId;
  action: string;
  approvedBy?: MeshDepartmentId;
  payload?: Record<string, unknown>;
}

const TOPIC_CAPABILITY_MAP: Record<string, { capabilityId: string; action: string; dept: MeshDepartmentId }> = {
  deploy: { capabilityId: "deploy_software", action: "deploy_preview", dept: "deployment" },
  build: { capabilityId: "open_pull_request", action: "create_pr", dept: "backend" },
  research: { capabilityId: "execute_research", action: "run_research", dept: "research" },
  finance: { capabilityId: "analyze_metrics", action: "check_mrr", dept: "finance" },
  marketing: { capabilityId: "publish_campaign", action: "campaign_status", dept: "growth" },
  release: { capabilityId: "publish_release", action: "publish", dept: "deployment" },
  venture: { capabilityId: "create_venture", action: "initialize", dept: "ceo" },
};

export function resolveCapabilityForTopic(topic: string): {
  capabilityId: string;
  action: string;
  dept: MeshDepartmentId;
} {
  const lower = topic.toLowerCase();
  for (const [key, cfg] of Object.entries(TOPIC_CAPABILITY_MAP)) {
    if (lower.includes(key)) return cfg;
  }
  return { capabilityId: "search_information", action: "query", dept: "research" };
}

export async function executeMeshCapabilityRequest(
  params: MeshCapabilityRequest
): Promise<CapabilityResult> {
  const request: CapabilityRequest = {
    capabilityId: params.capabilityId,
    context: {
      ventureId: params.ventureId,
      requestedBy: params.requestedBy,
      approvedBy: params.approvedBy ?? "ceo",
      action: params.action,
      payload: params.payload,
      metadata: { source: "executive-mesh" },
    },
  };
  return runCapabilityRequest(request);
}

export async function executeMeshCapabilityForTopic(
  topic: string,
  ventureId: string
): Promise<CapabilityResult> {
  const cfg = resolveCapabilityForTopic(topic);
  return executeMeshCapabilityRequest({
    capabilityId: cfg.capabilityId,
    ventureId,
    requestedBy: cfg.dept,
    action: cfg.action,
    approvedBy: "ceo",
    payload: { topic },
  });
}
