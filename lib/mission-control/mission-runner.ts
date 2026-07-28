/** PROGRAM 5150 — Mission stage runner (delegates to existing engines, no duplicate logic). */

import type {
  Mission,
  MissionPhase,
  MissionSession,
  MissionSessionStatus,
  MissionStage,
  MissionArtifact,
  IntentionType,
} from "./types";
import { advancePhase, getNextPhase, phaseLabelEs } from "./mission-flow";
import { appendHistoryEntry } from "./mission-history";
import {
  setSessionPhase,
  attachArtifact,
  isUnderstandingComplete,
  nextUnderstandingTopic,
  addSessionMessage,
} from "./mission-session";
import { generateMissionPlan } from "./mission-plan";
import { runBuildPhasePreview } from "./adapters/build-phase-adapter";
import { runValidationPhase } from "./mission-validator";
import { prepareDeployPreview } from "./adapters/deploy-preview-adapter";
import { prepareOperateEvolvePreview } from "./adapters/operate-evolve-adapter";

const PHASE_STATUS_MAP: Record<MissionPhase, MissionSessionStatus> = {
  UNDERSTAND: "UNDERSTANDING",
  PLAN: "PLANNING",
  BUILD: "BUILDING",
  VALIDATE: "VALIDATING",
  DEPLOY: "READY_FOR_DEPLOY",
  OPERATE: "OPERATING",
  EVOLVE: "EVOLVING",
};

const STATUS_PHASE_MAP: Partial<Record<MissionSessionStatus, MissionPhase>> = {
  DRAFT: "UNDERSTAND",
  UNDERSTANDING: "UNDERSTAND",
  PLANNING: "PLAN",
  BUILDING: "BUILD",
  VALIDATING: "VALIDATE",
  READY_FOR_DEPLOY: "DEPLOY",
  OPERATING: "OPERATE",
  EVOLVING: "EVOLVE",
  PAUSED: undefined,
  BLOCKED: undefined,
  COMPLETED: "EVOLVE",
  FAILED: "UNDERSTAND",
};

export function phaseToSessionStatus(phase: MissionPhase): MissionSessionStatus {
  return PHASE_STATUS_MAP[phase] ?? "DRAFT";
}

export function sessionStatusToPhase(status: MissionSessionStatus): MissionPhase | null {
  return STATUS_PHASE_MAP[status] ?? null;
}

export interface RunnerResult {
  session: MissionSession;
  reply: string;
  artifact?: MissionArtifact;
}

/** Advance mission one official stage with on-demand engine loading */
export async function runStageAdvance(session: MissionSession): Promise<RunnerResult> {
  const phase = session.currentStage;
  let updated = session;
  let reply = "";

  switch (phase) {
    case "UNDERSTAND":
      if (!isUnderstandingComplete(updated)) {
        const topic = nextUnderstandingTopic(updated);
        reply = topic
          ? topic.prompt
          : "Cuéntame más sobre tu visión — una decisión por mensaje.";
        updated = addSessionMessage(updated, "ceo", reply, true);
        return { session: updated, reply };
      }
      updated = setSessionPhase(updated, "PLAN");
      appendHistoryEntry(updated.missionId, "Fase PLAN iniciada", "PLAN", "PLANNING");
      return runStageAdvance(updated);

    case "PLAN": {
      const plan = generateMissionPlan(updated);
      updated = { ...updated, planStages: plan.stages };

      const { planOutputsForSession, acceptOutputPlan } = await import("@/lib/multi-output/output-coordinator");
      const multiPlan = acceptOutputPlan(planOutputsForSession(updated));
      const activeCount = multiPlan.outputs.filter((o) => o.requirement !== "excluded").length;

      const planArtifact: MissionArtifact = {
        id: `art-plan-${Date.now()}`,
        type: "plan",
        label: "Multi-Output Plan",
        phase: "PLAN",
        source: "heuristic",
        summary: `${plan.stages.length} etapas · ${activeCount} entregables · ~${multiPlan.estimatedMinutes}min · €${multiPlan.estimatedCostEur}`,
        createdAt: new Date().toISOString(),
      };
      updated = attachArtifact(updated, planArtifact);
      updated = setSessionPhase(updated, "BUILD");
      reply = `${multiPlan.explanation} Plan: ${activeCount} entregables (~${multiPlan.estimatedMinutes} min, €${multiPlan.estimatedCostEur}). Pasamos a BUILD — previews sin deploy real.`;
      updated = addSessionMessage(updated, "ceo", reply);
      appendHistoryEntry(updated.missionId, "Multi-output plan generado", "PLAN", "PLANNING", plan.summary);
      return { session: updated, reply, artifact: planArtifact };
    }

    case "BUILD": {
      const build = await runBuildPhasePreview(updated);
      for (const art of build.artifacts) {
        updated = attachArtifact(updated, art);
      }

      try {
        const { orchestrateMultiOutput } = await import("@/lib/multi-output/output-coordinator");
        const multiResult = await orchestrateMultiOutput(updated, { autoAccept: true });
        const multiArtifact: MissionArtifact = {
          id: `art-multi-${Date.now()}`,
          type: "build",
          label: "Multi-Output Release",
          phase: "BUILD",
          source: "heuristic",
          summary: `${multiResult.outputs.length} outputs · v${multiResult.release.release}${multiResult.errors.length > 0 ? ` · ${multiResult.errors.length} aislados` : ""}`,
          href: `/studio/${updated.missionId}`,
          createdAt: new Date().toISOString(),
        };
        updated = attachArtifact(updated, multiArtifact);
        reply = `${build.summary} ${multiResult.summary}`;
      } catch {
        reply = build.summary;
      }

      updated = setSessionPhase(updated, "VALIDATE");
      updated = addSessionMessage(updated, "ceo", reply);
      appendHistoryEntry(updated.missionId, "Build multi-output generado", "BUILD", "BUILDING");
      return { session: updated, reply };
    }

    case "VALIDATE": {
      const validation = await runValidationPhase(updated);
      updated = { ...updated, validationScores: validation.scores };
      const scoreArtifact: MissionArtifact = {
        id: `art-scores-${Date.now()}`,
        type: "score",
        label: "Validation Scores",
        phase: "VALIDATE",
        source: validation.scores.source,
        summary: `MVP ${validation.scores.mvpReadiness}% · Launch ${validation.scores.launchReadiness}%`,
        createdAt: validation.scores.generatedAt,
      };
      updated = attachArtifact(updated, scoreArtifact);
      updated = setSessionPhase(updated, "DEPLOY");
      reply = validation.summary;
      updated = addSessionMessage(updated, "ceo", reply);
      appendHistoryEntry(updated.missionId, "Validación completada", "VALIDATE", "VALIDATING");
      return { session: updated, reply, artifact: scoreArtifact };
    }

    case "DEPLOY": {
      const deploy = await prepareDeployPreview(updated);
      updated = attachArtifact(updated, deploy.artifact);
      updated = setSessionPhase(updated, "OPERATE");
      reply = deploy.summary;
      updated = addSessionMessage(updated, "ceo", reply);
      appendHistoryEntry(updated.missionId, "Deploy preview preparado", "DEPLOY", "READY_FOR_DEPLOY");
      return { session: updated, reply, artifact: deploy.artifact };
    }

    case "OPERATE": {
      const operate = prepareOperateEvolvePreview(updated, "OPERATE");
      updated = attachArtifact(updated, operate.artifact);
      updated = setSessionPhase(updated, "EVOLVE");
      reply = operate.summary;
      updated = addSessionMessage(updated, "ceo", reply);
      appendHistoryEntry(updated.missionId, "Operaciones preparadas", "OPERATE", "OPERATING");
      return { session: updated, reply, artifact: operate.artifact };
    }

    case "EVOLVE": {
      const evolve = prepareOperateEvolvePreview(updated, "EVOLVE");
      updated = attachArtifact(updated, evolve.artifact);
      updated = { ...updated, status: "COMPLETED" };
      reply = evolve.summary;
      updated = addSessionMessage(updated, "ceo", reply);
      appendHistoryEntry(updated.missionId, "Misión completada", "EVOLVE", "COMPLETED");
      return { session: updated, reply, artifact: evolve.artifact };
    }

    default:
      return { session: updated, reply: "Fase desconocida." };
  }
}

/** Sync legacy Mission phase advance with session */
export function syncMissionPhase(mission: Mission): Mission {
  const next = getNextPhase(mission.phase);
  if (!next) return mission;
  return advancePhase(mission);
}

export function stageLabel(stage: MissionStage): string {
  return `${stage.label} (${stage.owner}/${stage.department}) — ${stage.status}`;
}

export function intentionsForBuild(intent: IntentionType | null): IntentionType[] {
  if (!intent) return [];
  if (intent === "VENTURE") return ["VENTURE", "APPLICATION", "WEBSITE"];
  return [intent];
}

export function runnerProgressPercent(session: MissionSession): number {
  const order: MissionPhase[] = ["UNDERSTAND", "PLAN", "BUILD", "VALIDATE", "DEPLOY", "OPERATE", "EVOLVE"];
  const idx = order.indexOf(session.currentStage);
  if (idx < 0) return 0;
  if (session.status === "COMPLETED") return 100;
  return Math.round(((idx + 1) / order.length) * 100);
}

export function nextStageHint(session: MissionSession): string {
  const next = getNextPhase(session.currentStage);
  if (!next) return "Misión en fase final";
  return `Siguiente: ${phaseLabelEs(next)}`;
}
