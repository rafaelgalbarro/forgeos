/** PROGRAM 5390 — Selective synchronization on decision changes. */

import type { MultiOutputKind, MultiOutputPlan, SyncResult } from "./types";
import { getMultiOutputPlan, saveMultiOutputPlan } from "./multi-output-plan";
import { analyzeImpact, type ChangeScenario } from "./output-impact-analysis";
import {
  updateOutputStatus,
  syncPlanFromCreationOutputs,
} from "./output-status";
import {
  getSharedContext,
  updateSharedContextField,
  saveSharedContext,
  buildSharedContextFromSession,
} from "./shared-context";
import type { MissionSession } from "@/lib/mission-control/types";
import type { CreationOutputType } from "@/lib/creation-output/types";

export interface SyncOptions {
  scenario?: ChangeScenario;
  changeType?: string;
  description?: string;
  affectedKinds?: MultiOutputKind[];
}

/** Sync only affected outputs after a decision change — NOT full regeneration */
export async function syncAffectedOutputs(
  session: MissionSession,
  options: SyncOptions
): Promise<SyncResult> {
  const start = Date.now();
  const missionId = session.missionId;

  let affected: MultiOutputKind[];
  if (options.scenario) {
    const impact = analyzeImpact(options.scenario);
    affected = impact.affectedOutputs;
  } else if (options.affectedKinds) {
    affected = options.affectedKinds;
  } else {
    affected = [];
  }

  let workingPlan: MultiOutputPlan;
  const existing = getMultiOutputPlan(missionId);
  if (existing) {
    workingPlan = existing;
  } else {
    const { createMultiOutputPlan, acceptPlan } = await import("./multi-output-plan");
    workingPlan = acceptPlan(createMultiOutputPlan(session));
  }

  const activeAffected = affected.filter((k) => {
    const o = workingPlan.outputs.find((p) => p.kind === k);
    return o && o.requirement !== "excluded";
  });

  const skippedOutputs = workingPlan.outputs
    .filter((o) => o.requirement !== "excluded" && !activeAffected.includes(o.kind))
    .map((o) => o.kind);

  const updatedOutputs: MultiOutputKind[] = [];
  const failedOutputs: SyncResult["failedOutputs"] = [];

  // Update shared context based on scenario
  let ctx = getSharedContext(missionId);
  if (!ctx) {
    ctx = buildSharedContextFromSession(session);
    saveSharedContext(ctx);
  }

  if (options.scenario === "pricing") {
    ctx = updateSharedContextField(missionId, "pricing", {
      ...ctx.pricing,
      tiers: ctx.pricing.tiers.map((t) =>
        t.id === "pro" ? { ...t, price: "179" } : t
      ),
    }) ?? ctx;
  }
  if (options.scenario === "add_supervisor_role") {
    ctx = updateSharedContextField(missionId, "users", [
      ...ctx.users,
      { id: "supervisor", label: "Supervisor", permissions: ["read", "write", "approve", "supervise"] },
    ]) ?? ctx;
  }
  if (options.scenario === "visual_identity") {
    ctx = updateSharedContextField(missionId, "brand", {
      ...ctx.brand,
      tokens: { ...ctx.brand.tokens, primaryColor: "#7c3aed", accentColor: "#a78bfa" },
    }) ?? ctx;
  }

  // Regenerate only affected creation-output types
  const creationTypes = activeAffected
    .map((k) => workingPlan.outputs.find((o) => o.kind === k)?.creationOutputType)
    .filter(Boolean) as CreationOutputType[];

  for (const kind of activeAffected) {
    workingPlan = updateOutputStatus(workingPlan, kind, "generando");
  }
  saveMultiOutputPlan(workingPlan);

  if (creationTypes.length > 0) {
    try {
      const { buildAllOutputs } = await import("@/lib/creation-output/output-builder");
      const { resolveVentureFixture } = await import("@/lib/venture-e2e/fixture-registry");

      const slug = session.ventureSlug;
      const fixture = slug ? resolveVentureFixture(slug) : undefined;

      const outputs = await buildAllOutputs({
        missionId,
        ventureId: fixture?.venture?.id ?? session.ventureId ?? `venture-${missionId}`,
        ventureSlug: slug ?? fixture?.slug,
        ventureName: ctx.companyIdentity.name,
        ideaText: session.intent?.extractedIdea ?? ctx.companyIdentity.valueProposition,
        types: creationTypes,
      });

      workingPlan = syncPlanFromCreationOutputs(workingPlan, outputs);
      for (const kind of activeAffected) {
        if (creationTypes.some((t) => workingPlan.outputs.find((o) => o.kind === kind)?.creationOutputType === t)) {
          updatedOutputs.push(kind);
          workingPlan = updateOutputStatus(workingPlan, kind, "preview", { health: "healthy" });
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Sync error";
      for (const kind of activeAffected) {
        failedOutputs.push({
          kind,
          error: msg,
          repairPlan: ["Verificar shared context", "Reintentar sync selectivo"],
        });
        workingPlan = updateOutputStatus(workingPlan, kind, "fallido", { health: "error", blockedReason: msg });
      }
    }
  }

  // Non-creation kinds: mark as synced from shared context
  for (const kind of activeAffected) {
    if (!updatedOutputs.includes(kind) && !failedOutputs.some((f) => f.kind === kind)) {
      const o = workingPlan.outputs.find((p) => p.kind === kind);
      if (o && !o.creationOutputType) {
        updatedOutputs.push(kind);
        workingPlan = updateOutputStatus(workingPlan, kind, "preview", { health: "healthy" });
      }
    }
  }

  saveMultiOutputPlan(workingPlan);

  return {
    missionId,
    trigger: options.scenario ?? options.changeType ?? "custom",
    updatedOutputs,
    skippedOutputs,
    failedOutputs,
    durationMs: Date.now() - start,
  };
}

/** Apply pricing change scenario */
export async function syncPricingChange(session: MissionSession): Promise<SyncResult> {
  return syncAffectedOutputs(session, { scenario: "pricing" });
}

/** Apply target customer change */
export async function syncTargetCustomerChange(session: MissionSession): Promise<SyncResult> {
  return syncAffectedOutputs(session, { scenario: "target_customer" });
}

/** Remove mobile from scope */
export async function syncRemoveMobile(session: MissionSession): Promise<SyncResult> {
  const plan = getMultiOutputPlan(session.missionId);
  if (plan) {
    const { modifyPlanOutputs } = await import("./multi-output-plan");
    saveMultiOutputPlan(modifyPlanOutputs(plan, { MOBILE: "excluded" }));
  }
  return {
    missionId: session.missionId,
    trigger: "remove_mobile",
    updatedOutputs: ["MOBILE"],
    skippedOutputs: plan?.outputs.filter((o) => o.kind !== "MOBILE" && o.requirement !== "excluded").map((o) => o.kind) ?? [],
    failedOutputs: [],
    durationMs: 0,
  };
}

export function getSyncPreview(session: MissionSession, scenario: ChangeScenario) {
  const impact = analyzeImpact(scenario);
  const plan = getMultiOutputPlan(session.missionId);
  return {
    impact,
    currentPlan: plan,
    willRegenerate: impact.affectedOutputs.filter((k) => {
      const o = plan?.outputs.find((p) => p.kind === k);
      return o?.creationOutputType;
    }),
    willSkip: impact.unaffectedOutputs,
  };
}
