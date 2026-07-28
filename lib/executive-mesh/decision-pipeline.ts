/** Executive Intelligence Mesh — Decision Pipeline (RC3.5). */

import type { VentureProject } from "@/lib/domain/venture";
import { resolveVenture } from "@/lib/venture/resolve-venture";
import { VANDL_VENTURE_ID } from "@/lib/fixtures/vandl-venture";
import { ensureVandlSeeded } from "@/lib/store/vandl-seed";
import {
  meshRunCeoBrief,
  meshRunBoardSession,
  meshBuildConsensus,
  meshWriteConsensusDecision,
} from "./adapters/orchestration-adapter";
import {
  meshWriteDecision,
  meshWriteTimelineEvent,
  meshPersistMemoryRecord,
} from "./adapters/intelligence-adapter";
import { meshDispatchExecutionPlan } from "./adapters/runtime-adapter";
import { runCollaborationChain } from "./collaboration-engine";
import { buildDebateFromDisagreement, resolveDebateWithCeo } from "./disagreement/debate-engine";
import { scheduleMeeting, completeMeeting } from "./meetings/meeting-engine";
import { getExecutiveScores, updateScoreAfterParticipation } from "./scores/executive-score";
import type { FounderRequest, MeshMemoryRecord, MeshPipelineResult, PipelineStage } from "./types";

function needsDebate(request: FounderRequest, ceoSummary: string): boolean {
  if (request.requiresDebate !== undefined) return request.requiresDebate;
  const highUrgency = request.urgency === "high";
  const risky = /riesgo|risk|conflict|debate|escalar/i.test(ceoSummary + request.topic);
  return highUrgency || risky;
}

export async function processExecutiveMeshRequest(
  request: FounderRequest,
  venture?: VentureProject
): Promise<MeshPipelineResult> {
  const started = Date.now();
  const warnings: string[] = [];
  const stages: PipelineStage[] = ["founder"];

  ensureVandlSeeded();
  const v =
    venture ??
    resolveVenture(request.ventureId) ??
    resolveVenture(VANDL_VENTURE_ID);

  if (!v) {
    throw new Error("Venture not found for executive mesh request");
  }

  stages.push("ceo");
  const ceo = await meshRunCeoBrief(v);
  warnings.push(...ceo.warnings);
  updateScoreAfterParticipation("ceo", { participation: 0.02 });

  const ceoSummary =
    ceo.output?.executiveSummary ??
    ceo.output?.summary ??
    `CEO evalúa: ${request.topic}`;

  const debateRequired = needsDebate(request, ceoSummary);
  stages.push("debate-check");

  let consensusText: string | undefined;
  let decisionId: string | undefined;
  let debateId: string | undefined;
  let meetingId: string | undefined;
  const contributors: MeshMemoryRecord["contributors"] = ["ceo"];

  if (debateRequired) {
    stages.push("executive-board");
    const board = await meshRunBoardSession(v);
    warnings.push(...board.warnings);
    contributors.push("cto", "cpo", "cfo", "legal");

    stages.push("specialists");
    runCollaborationChain(request.topic);

    stages.push("consensus");
    const consensus = meshBuildConsensus(board.opinions);
    consensusText = consensus.finalDecision;

    if (consensus.level === "CONFLICT") {
      const debate = buildDebateFromDisagreement(
        request.topic,
        "cto",
        "Proceder con build técnico",
        "cfo",
        "Esperar validación financiera"
      );
      debateId = debate.id;
      resolveDebateWithCeo(
        debate.id,
        `CEO arbitra: ${consensus.finalDecision}`
      );
      warnings.push("Debate escalado al CEO — consenso parcial.");
    }

    stages.push("decision-graph");
    const graphNodeId = meshWriteConsensusDecision(
      v.id,
      consensus,
      board.sessionId
    );
    decisionId = meshWriteDecision({
      ventureId: v.id,
      title: `Mesh consensus — ${request.topic}`,
      rationale: consensus.rationale,
      recommendation: consensus.finalDecision,
      confidence: consensus.confidence,
    });
    void graphNodeId;

    const meeting = scheduleMeeting("weekly-board", request.topic);
    meetingId = meeting.id;
    completeMeeting(meeting.id, {
      consensus: consensus.finalDecision,
      actions: ["Ejecutar plan consensuado", "Actualizar timeline"],
      followUp: ["Revisión en 7 días"],
    });
  } else {
    consensusText = undefined;
    decisionId = meshWriteDecision({
      ventureId: v.id,
      title: `CEO direct — ${request.topic}`,
      rationale: ceoSummary,
      recommendation: ceo.output?.recommendation ?? ceo.output?.priority ?? "Seguir prioridad actual",
      confidence: ceo.output?.confidence ?? 0.85,
    });
  }

  stages.push("execution-plan");
  const executionPlan = [
    `Validar decisión: ${decisionId}`,
    `Actualizar knowledge hub`,
    `Sincronizar venture workspace`,
    ...(debateRequired ? ["Registrar consenso de board"] : ["CEO briefing distribuido"]),
  ];

  stages.push("runtime");
  const runtime = meshDispatchExecutionPlan(executionPlan);

  const timelineEventId = meshWriteTimelineEvent({
    ventureId: v.id,
    title: debateRequired ? "Executive Board consensus" : "CEO direct response",
    description: consensusText ?? ceoSummary,
  });

  const memoryRecord = meshPersistMemoryRecord({
    id: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    ventureId: v.id,
    owner: "ceo",
    contributors,
    reasoning: consensusText ?? ceoSummary,
    confidence: debateRequired ? 0.82 : 0.9,
    knowledgeRefs: ["knowledge-hub", "venture-memory"],
    decisionId,
    timelineEventId,
    pipelineStages: stages,
  });

  stages.push("response");

  return {
    requestId: memoryRecord.id,
    ventureId: v.id,
    stages,
    needsDebate: debateRequired,
    ceoResponse: ceoSummary,
    consensus: consensusText,
    decisionId,
    executionPlan: runtime.steps,
    runtimeDispatched: runtime.dispatched,
    memoryRecordId: memoryRecord.id,
    debateId,
    meetingId,
    scores: getExecutiveScores(),
    latencyMs: Date.now() - started,
    warnings,
  };
}
