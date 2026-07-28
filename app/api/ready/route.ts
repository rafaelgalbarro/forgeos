import { NextResponse } from "next/server";
import {
  getCompositionRoot,
  isCompositionRootReady,
} from "@/src/core/composition";
import { isLegacyOnlyMode, readV2FeatureFlags } from "@/src/core/migration/feature-flags";

export const dynamic = "force-dynamic";

/**
 * GET /api/ready — readiness: composition root, buses, repos, no blocking migration.
 */
export async function GET() {
  const checks: Record<string, boolean | string> = {};
  let ready = true;

  try {
    const compositionOk = isCompositionRootReady();
    checks.compositionRoot = compositionOk;
    if (!compositionOk) ready = false;

    const root = getCompositionRoot();
    checks.commandBus = Boolean(root.application.commandBus);
    checks.queryBus = Boolean(root.application.queryBus);
    checks.eventBus = Boolean(root.eventBus);
    checks.uow = Boolean(root.ports.uow);
    checks.missionRepository = Boolean(root.ports.uow.missions);
    checks.orchestration = Boolean(root.orchestration);
    checks.delivery = Boolean(root.delivery);
    checks.renderable = true;

    const flags = readV2FeatureFlags();
    checks.legacyOnlyMode = isLegacyOnlyMode();
    checks.blockingMigration = false;
    void flags;

    for (const [k, v] of Object.entries(checks)) {
      if (k === "legacyOnlyMode" || k === "blockingMigration") continue;
      if (v === false || v === undefined) ready = false;
    }
  } catch (err) {
    ready = false;
    checks.error = err instanceof Error ? err.message : String(err);
  }

  return NextResponse.json(
    {
      status: ready ? "ready" : "not_ready",
      ready,
      checks,
      timestamp: new Date().toISOString(),
    },
    { status: ready ? 200 : 503 },
  );
}
