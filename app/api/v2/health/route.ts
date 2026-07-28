import { NextResponse } from "next/server";
import { getCompositionRoot, isCompositionRootReady } from "@/src/core/composition";
import { readV2FeatureFlags } from "@/src/core/migration/feature-flags";
import { COMMAND_TYPES } from "@/src/core/application/commands/definitions";
import { QUERY_TYPES } from "@/src/core/application/queries/definitions";

export const dynamic = "force-dynamic";

/**
 * GET /api/v2/health — V2 subsystem health (flags, handlers, workflow, persistence).
 */
export async function GET() {
  const flags = readV2FeatureFlags();
  const issues: string[] = [];

  let rootReport: Record<string, unknown> = {};
  try {
    if (!isCompositionRootReady()) {
      issues.push("composition_root_not_ready");
    }
    const root = getCompositionRoot();
    rootReport = {
      commandHandlersRegistered: COMMAND_TYPES.length,
      queryHandlersRegistered: QUERY_TYPES.length,
      workflowEngine: Boolean(root.orchestration),
      capabilityRegistry: Boolean(root.orchestration),
      persistence: ".forgeos/v2-store/application-state.json",
      missionCount: root.store.missions.size,
      graph: Boolean(root.delivery.lineage),
      migrationAdapter: "src/core/migration (flags default OFF)",
      serviceMap: root.serviceMap,
    };

    if (!root.application.commandBus) issues.push("command_bus_undefined");
    if (!root.application.queryBus) issues.push("query_bus_undefined");
    if (!root.ports.uow) issues.push("uow_undefined");
    if (!root.orchestration) issues.push("workflow_undefined");
    if (!root.delivery) issues.push("delivery_undefined");
  } catch (err) {
    issues.push(err instanceof Error ? err.message : String(err));
  }

  const healthy = issues.length === 0;
  const certificationReadiness = healthy
    ? "composition_ready_flags_default_off"
    : "blocked";

  return NextResponse.json(
    {
      status: healthy ? "ok" : "degraded",
      healthy,
      flags,
      issues,
      certificationReadiness,
      ...rootReport,
      timestamp: new Date().toISOString(),
    },
    { status: healthy ? 200 : 503 },
  );
}
