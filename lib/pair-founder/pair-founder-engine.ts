/** PROGRAM 5200 — Pair Founder orchestrator (never on initial render). */

import type { Mission, PendingDecision } from "@/lib/mission-control/types";
import type { CEOInsight, DecisionRecord, PairFounderTrigger, PairFounderTurnResult } from "./types";
import {
  readVentureMemory,
  writeVentureMemory,
  updateMemoryFromMission,
  memoryDelta,
  hydrateVentureMemory,
} from "./venture-memory";
import {
  detectContradictions,
  reframeReplyForContradictions,
  replyContradictsMemory,
} from "./contradiction-detector";
import { detectRisks, risksToStatusStrings } from "./risk-advisor";
import { proposeAlternatives } from "./alternative-generator";
import { prioritizeDecisions, buildPriorityList } from "./priority-advisor";
import {
  buildRecommendation,
  buildVentureUnderstanding,
  buildStructuredRecommendations,
  recommendationsToStatusStrings,
} from "./recommendations";
import { adaptPreferencesFromInput, readFounderPreferences, preferenceToneHint } from "./founder-preferences";
import { adaptFounderProfileFromInput } from "./founder-profile";
import {
  buildPairFounderContext,
  buildHypotheses,
  buildPriorities,
  missionToContext,
} from "./pair-founder-context";
import {
  detectContextChange,
  applyContextChangeToMission,
  explainContextChange,
  isExplicitReviewRequest,
} from "./context-change-handler";
import {
  buildMissionContextBlocks,
  recordDecisionInGraph,
  isRealAiAvailable,
  compileCeoPrompt,
} from "./adapters";
import { consultExecutiveMesh } from "@/lib/mission-control/adapters/executive-mesh-adapter";
import { buildExitMetrics, refreshExitStrategyOnTurn } from "@/lib/mission-control/exit-strategy/exit-orchestrator";

export { missionToContext } from "./pair-founder-context";

/** Static placeholder — NO engine invocation on mount. */
export function createEmptyCeoInsight(confidence = 50): CEOInsight {
  return {
    ventureUnderstanding: "El CEO construirá contexto con cada interacción.",
    deltaSinceLastTurn: "Estado inicial — sin análisis previo",
    hypotheses: [],
    risks: [],
    priorities: [],
    recommendations: [],
    nextRecommendation: {
      action: "Comenzar misión",
      justification: "Envía un mensaje o resuelve una decisión para activar el análisis.",
    },
    contradictions: [],
    pendingDecisionCount: 0,
    confidence,
    generatedAt: new Date().toISOString(),
  };
}

/** @deprecated Use createEmptyCeoInsight — does NOT run engine heuristics. */
export function getDefaultCeoInsight(mission: Mission): CEOInsight {
  return createEmptyCeoInsight(mission.status.confidence);
}

export async function runPairFounderTurn(
  mission: Mission,
  proposedReply: string,
  userInput?: string,
  trigger: PairFounderTrigger = "user_message"
): Promise<PairFounderTurnResult & { mission: Mission }> {
  const prevMemory = readVentureMemory(mission.id);
  await hydrateVentureMemory(mission.id);

  const workspaceId = "ws-default";
  if (userInput) {
    adaptPreferencesFromInput(mission.id, userInput);
    adaptFounderProfileFromInput(workspaceId, userInput);
  }

  const prefs = readFounderPreferences(mission.id);
  const ctx = await buildPairFounderContext(mission, userInput, workspaceId);

  let meshHints: string[] = [];
  try {
    const mesh = await consultExecutiveMesh(mission.title);
    meshHints = [mesh.summary];
  } catch {
    /* mesh stub ok */
  }
  ctx.meshHints = [...(ctx.meshHints ?? []), ...meshHints];

  const contextChange = detectContextChange(userInput);
  let workingMission = mission;
  let workingMemory = prevMemory;

  if (contextChange?.changed) {
    const applied = applyContextChangeToMission(mission, contextChange, prevMemory);
    workingMission = applied.mission;
    workingMemory = applied.memory;
  }

  const contradictions = detectContradictions(ctx, workingMemory, userInput);
  const risks = detectRisks(ctx, workingMemory, ctx.meshHints);
  const alternatives = proposeAlternatives(ctx, workingMemory, prefs);
  const reorderedDecisions = prioritizeDecisions(workingMission.pendingDecisions, ctx, risks);
  const ctxWithPrioritized = { ...ctx, pendingDecisions: reorderedDecisions };

  const recommendation = buildRecommendation(ctxWithPrioritized, workingMemory, prefs, alternatives);
  const ventureUnderstanding = buildVentureUnderstanding(ctxWithPrioritized, workingMemory);
  const hypotheses = buildHypotheses(ctxWithPrioritized, workingMemory);
  const priorities = buildPriorities(ctxWithPrioritized);
  const priorityList = buildPriorityList(reorderedDecisions, ctxWithPrioritized);

  let confidence = Math.min(98, workingMission.status.confidence + (contradictions.length ? -5 : 3));

  const structuredRecs = buildStructuredRecommendations(
    ctxWithPrioritized,
    workingMemory,
    prefs,
    alternatives,
    contradictions,
    risks,
    confidence
  );

  let reply = proposedReply;

  if (trigger === "explicit_review" || isExplicitReviewRequest(userInput ?? "")) {
    const reviewNote = `Revisión estratégica:\n• Entendimiento: ${ventureUnderstanding.slice(0, 120)}…\n• Prioridad: ${priorities[0] ?? recommendation.action}`;
    reply = `${reviewNote}\n\n${reply}`;
  }

  if (contextChange?.changed) {
    reply = `${explainContextChange(contextChange)}\n\n${reply}`;
  }

  reply = reframeReplyForContradictions(reply, contradictions);

  const replyContradictions = replyContradictsMemory(reply, workingMemory);
  if (replyContradictions.length) {
    reply = reframeReplyForContradictions(reply, replyContradictions);
  }

  const toneHint = preferenceToneHint(prefs);
  if (!reply.includes("?") && contradictions.length === 0 && prefs.tone === "analytical") {
    reply = `${reply}\n\n(${toneHint})`;
  }

  if (await isRealAiAvailable()) {
    const compiled = await compileCeoPrompt(ctxWithPrioritized, recommendation.action);
    if (compiled) {
      /* AI Runtime adapter ready — heuristic reply used as fallback content */
    }
  }

  const updatedMissionBase: Mission = refreshExitStrategyOnTurn({
    ...workingMission,
    pendingDecisions: reorderedDecisions,
    status: {
      ...workingMission.status,
      risks: risksToStatusStrings(risks),
      recommendations: recommendationsToStatusStrings(recommendation),
      nextDecision: reorderedDecisions.find((d) => !d.resolved)?.title,
      confidence,
    },
  });

  const newMemory = updateMemoryFromMission(workingMemory, updatedMissionBase, userInput);
  writeVentureMemory(newMemory);

  const exitMetrics = buildExitMetrics(updatedMissionBase);
  const pendingCount = reorderedDecisions.filter((d) => !d.resolved).length;

  const insight: CEOInsight = {
    ventureUnderstanding,
    deltaSinceLastTurn: memoryDelta(prevMemory, newMemory),
    hypotheses,
    risks,
    priorities: priorityList.length ? priorityList : priorities,
    recommendations: structuredRecs,
    nextRecommendation: {
      action: recommendation.action,
      justification: recommendation.justification,
      alternatives: recommendation.alternatives,
    },
    contradictions,
    pendingDecisionCount: pendingCount,
    confidence,
    generatedAt: new Date().toISOString(),
    exitReadiness: exitMetrics?.readiness,
    strategicAlignment: exitMetrics?.alignment,
  };

  const decisionRecords: DecisionRecord[] = [];
  for (const d of reorderedDecisions) {
    if (d.resolved && d.selectedOption) {
      const existing = mission.decisionLog?.some(
        (r) => r.title === d.title && r.selectedOption === d.selectedOption
      );
      if (!existing) {
        decisionRecords.push({
          id: `dr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 5)}`,
          timestamp: new Date().toISOString(),
          phase: mission.phase,
          category: d.category,
          title: d.title,
          selectedOption: d.selectedOption,
          source: mission.autoPilot.lastAutoAction?.includes(d.title) ? "auto-pilot" : "user",
        });
        void recordDecisionInGraph({
          ventureId: mission.id,
          title: d.title,
          rationale: d.selectedOption,
          confidence: insight.confidence / 100,
        });
      }
    }
  }

  const updatedMission: Mission = {
    ...updatedMissionBase,
    ceoInsight: insight,
    decisionLog: [...(mission.decisionLog ?? []), ...decisionRecords],
  };

  void buildMissionContextBlocks(ctxWithPrioritized);

  return {
    mission: updatedMission,
    reply,
    insight,
    memory: newMemory,
    decisionRecords,
    reorderedDecisions,
    contextChange: contextChange ?? undefined,
  };
}

export function applyPrioritizedDecisions(mission: Mission): Mission {
  const ctx = missionToContext(mission);
  const memory = readVentureMemory(mission.id);
  const risks = detectRisks(ctx, memory);
  const reordered = prioritizeDecisions(mission.pendingDecisions, ctx, risks);
  return { ...mission, pendingDecisions: reordered };
}

export async function runPairFounderReview(mission: Mission): Promise<PairFounderTurnResult & { mission: Mission }> {
  const lastCeo = [...mission.messages].reverse().find((m) => m.role === "ceo");
  return runPairFounderTurn(
    mission,
    lastCeo?.content ?? "Revisión estratégica solicitada.",
    "revisar",
    "explicit_review"
  );
}
