/** PROGRAM 5390 — E2E NEXORA FIELD multi-output validation. */

import {
  NEXORA_FIELD_ALIAS,
  NEXORA_FIELD_IDEA,
  NEXORA_FIELD_VENTURE_ID,
} from "@/lib/fixtures/nexora-field-venture";
import { createMissionSession } from "@/lib/mission-control/mission-session";
import { orchestrateMultiOutput } from "./output-coordinator";
import { syncAffectedOutputs } from "./output-sync";
import type { MultiOutputPlan, SyncResult } from "./types";
import { MULTI_OUTPUT_VERSION } from "./types";

export const NEXORA_MULTI_OUTPUT_MISSION_ID = "mc-nexora-field-e2e-5390";

export interface NexoraMultiOutputResult {
  missionId: string;
  ventureSlug: string;
  plan: MultiOutputPlan;
  outputCount: number;
  activeOutputCount: number;
  syncTests: { scenario: string; result: SyncResult }[];
  releaseVersion: string;
  durationMs: number;
  allDeliverablesGenerated: boolean;
  disclaimer: string;
}

export async function runNexoraMultiOutputE2E(): Promise<NexoraMultiOutputResult> {
  const start = Date.now();

  const session = createMissionSession(NEXORA_FIELD_IDEA);
  session.missionId = NEXORA_MULTI_OUTPUT_MISSION_ID;
  session.ventureSlug = NEXORA_FIELD_ALIAS;
  session.ventureId = NEXORA_FIELD_VENTURE_ID;
  session.intent = {
    primary: "VENTURE",
    secondary: ["APPLICATION", "MOBILE"],
    confidence: 0.9,
    extractedIdea: NEXORA_FIELD_IDEA,
  };

  const orchestration = await orchestrateMultiOutput(session, { autoAccept: true });

  // Test selective sync scenarios
  const syncTests: { scenario: string; result: SyncResult }[] = [];

  syncTests.push({
    scenario: "pricing",
    result: await syncAffectedOutputs(session, { scenario: "pricing" }),
  });
  syncTests.push({
    scenario: "add_supervisor_role",
    result: await syncAffectedOutputs(session, { scenario: "add_supervisor_role" }),
  });

  const active = orchestration.plan.outputs.filter((o) => o.requirement !== "excluded");
  const generated = active.filter(
    (o) => o.status === "preview" || o.status === "aprobado" || o.status === "desplegado"
  );

  return {
    missionId: NEXORA_MULTI_OUTPUT_MISSION_ID,
    ventureSlug: NEXORA_FIELD_ALIAS,
    plan: orchestration.plan,
    outputCount: orchestration.plan.outputs.length,
    activeOutputCount: active.length,
    syncTests,
    releaseVersion: orchestration.release.release,
    durationMs: Date.now() - start,
    allDeliverablesGenerated: generated.length >= 8,
    disclaimer:
      "NEXORA FIELD es caso de validación E2E genérico. Sin lógica hardcoded — adapters reutilizan motores existentes.",
  };
}

export function getNexoraMultiOutputStudioHref(): string {
  return `/studio/${NEXORA_MULTI_OUTPUT_MISSION_ID}`;
}

export function getNexoraMissionControlHref(): string {
  return `/mission-control/${NEXORA_MULTI_OUTPUT_MISSION_ID}`;
}

export { MULTI_OUTPUT_VERSION };
