"use server";

/** PROGRAM 5150 — On-demand mission engines (no heavy imports on first render). */

import type { MissionValidationScores } from "@/lib/mission-control/types";

export async function runMissionValidationAction(idea: string): Promise<MissionValidationScores> {
  const { runValidationPhase } = await import("@/lib/mission-control/mission-validator");
  const session = {
    missionId: "server-preview",
    workspaceId: "ws-default",
    founderId: "founder-default",
    intent: { primary: "VENTURE" as const, secondary: ["APPLICATION" as const], confidence: 0.8, extractedIdea: idea },
    currentStage: "VALIDATE" as const,
    status: "VALIDATING" as const,
    state: {
      sessionStatus: "VALIDATING" as const,
      phase: "VALIDATE" as const,
      understandingComplete: true,
      planComplete: true,
      buildComplete: true,
      validateComplete: false,
      deployPrepared: false,
      operatePrepared: false,
      evolvePrepared: false,
    },
    conversation: [],
    decisions: [],
    artifacts: [],
    events: [],
    pendingApprovals: [],
    activeDepartments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const result = await runValidationPhase(session);
  return result.scores;
}

export async function runMissionBuildPreviewAction(idea: string): Promise<{ summary: string; artifactCount: number }> {
  const { runBuildPhasePreview } = await import("@/lib/mission-control/adapters/build-phase-adapter");
  const session = {
    missionId: "server-preview",
    workspaceId: "ws-default",
    founderId: "founder-default",
    intent: { primary: "VENTURE" as const, secondary: ["APPLICATION" as const], confidence: 0.8, extractedIdea: idea },
    currentStage: "BUILD" as const,
    status: "BUILDING" as const,
    state: {
      sessionStatus: "BUILDING" as const,
      phase: "BUILD" as const,
      understandingComplete: true,
      planComplete: true,
      buildComplete: false,
      validateComplete: false,
      deployPrepared: false,
      operatePrepared: false,
      evolvePrepared: false,
    },
    conversation: [],
    decisions: [],
    artifacts: [],
    events: [],
    pendingApprovals: [],
    activeDepartments: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const result = await runBuildPhasePreview(session);
  return { summary: result.summary, artifactCount: result.artifacts.length };
}

export async function runMissionStageAdvanceAction(
  missionId: string
): Promise<{ reply: string; phase: string; status: string }> {
  const { getMissionRepository } = await import("@/lib/mission-control/mission-repository");
  const { runStageAdvance } = await import("@/lib/mission-control/mission-runner");

  const repo = getMissionRepository();
  const session = repo.findById(missionId);
  if (!session) {
    return { reply: "Misión no encontrada", phase: "UNDERSTAND", status: "DRAFT" };
  }

  const result = await runStageAdvance(session);
  repo.save(result.session);
  return {
    reply: result.reply,
    phase: result.session.currentStage,
    status: result.session.status,
  };
}

export async function classifyMissionIntentAction(input: string): Promise<{
  primary: string;
  secondary?: string[];
  confidence: number;
  explanation: string;
}> {
  const { classifyMissionIntent, formatCeoIntentionExplanation } = await import(
    "@/lib/mission-control/intention-engine"
  );
  const intent = classifyMissionIntent(input);
  return {
    primary: intent.primary,
    secondary: intent.secondary,
    confidence: intent.confidence,
    explanation: formatCeoIntentionExplanation(intent),
  };
}
