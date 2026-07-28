/** ForgeOS Capabilities Lab — RC4.9. */

import {
  listAllCapabilities,
  getCapabilityHealthSummary,
  getCapabilityAuditLogs,
  getCapabilityTelemetry,
  getCapabilityHistory,
  getCapabilityEvents,
  getCapabilityMetrics,
  getCapabilityStore,
  runCapabilityRequest,
} from "@/lib/capabilities";
import { resolveCapability } from "@/lib/capabilities/capability-resolver";
import { planCapabilityExecution } from "@/lib/capabilities/capability-planner";
import type { CapabilityResult } from "@/lib/capabilities/types";

export interface CapabilitiesLabSnapshot {
  registry: ReturnType<typeof listAllCapabilities>;
  health: ReturnType<typeof getCapabilityHealthSummary>;
  categories: Record<string, number>;
  auditLogs: ReturnType<typeof getCapabilityAuditLogs>;
  telemetry: ReturnType<typeof getCapabilityTelemetry>;
  history: ReturnType<typeof getCapabilityHistory>;
  events: ReturnType<typeof getCapabilityEvents>;
  metrics: ReturnType<typeof getCapabilityMetrics>;
  store: ReturnType<typeof getCapabilityStore>;
  sampleResolver: ReturnType<typeof resolveCapability>;
  samplePlan: ReturnType<typeof planCapabilityExecution>;
  sampleExecution: CapabilityResult | null;
}

export async function runCapabilitiesLab(
  ventureId = "demo-venture-vandl"
): Promise<CapabilitiesLabSnapshot> {
  const registry = listAllCapabilities();
  const categories: Record<string, number> = {};
  for (const c of registry) {
    categories[c.category] = (categories[c.category] ?? 0) + 1;
  }

  const deployRequest = {
    capabilityId: "deploy_software",
    context: {
      ventureId,
      requestedBy: "deployment" as const,
      approvedBy: "ceo" as const,
      action: "deploy_preview",
    },
  };

  const sampleResolver = resolveCapability(deployRequest);
  const samplePlan = planCapabilityExecution(deployRequest, sampleResolver);

  let sampleExecution: CapabilityResult | null = null;
  try {
    sampleExecution = await runCapabilityRequest(deployRequest);
  } catch {
    sampleExecution = null;
  }

  return {
    registry,
    health: getCapabilityHealthSummary(),
    categories,
    auditLogs: getCapabilityAuditLogs(ventureId),
    telemetry: getCapabilityTelemetry(),
    history: getCapabilityHistory(ventureId),
    events: getCapabilityEvents(ventureId),
    metrics: getCapabilityMetrics(),
    store: getCapabilityStore(ventureId),
    sampleResolver,
    samplePlan,
    sampleExecution,
  };
}
