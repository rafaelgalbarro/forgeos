/** AI Collaboration Room Lab — executive meeting orchestration (Epic 7.4). */

import { runExecutiveIntelligence, type ExecutiveIntelligenceResult } from "@/lib/ceo-office/executive-runtime";
import { getExecutiveGraphForVenture } from "@/lib/ai-orchestration/decision-graph-writer";
import type { BoardMemberId, ExecutiveGraphNode } from "@/lib/ai-orchestration/types";
import {
  runExecutiveBoardSession,
  type BoardSessionResult,
} from "@/lib/intelligence/board-runtime";
import {
  buildConsensus,
  type BoardOpinion,
  type ConsensusResult,
} from "@/lib/intelligence/consensus-engine";
import { createLabMockVenture, LAB_MOCK_VENTURE_ID } from "./mock-venture";

/** Core executives in the collaboration room (Founder is observer, not a board seat). */
export const COLLABORATION_PARTICIPANTS: BoardMemberId[] = [
  "CEO",
  "CTO",
  "CMO",
  "CFO",
  "Legal",
  "Growth",
  "Research",
];

export interface FounderObserver {
  role: "Founder";
  title: string;
  stance: string;
  decisionPrompt: string;
  recommendedAction: string;
  awaitingDecision: boolean;
}

export interface AiCollaborationLabResult {
  ventureId: string;
  ventureName: string;
  agenda: string;
  sessionId: string | null;
  participants: BoardOpinion[];
  founder: FounderObserver;
  consensus: ConsensusResult | null;
  decisionGraphNodes: ExecutiveGraphNode[];
  boardSession: Pick<
    BoardSessionResult,
    "sessionId" | "aiCount" | "heuristicCount" | "mockCount" | "latencyMs"
  > | null;
  runtime: ExecutiveIntelligenceResult | null;
  source: "ai" | "heuristic" | "mock";
  fallbackUsed: boolean;
  warnings: string[];
  latencyMs: number;
  generatedAt: string;
  error?: string;
}

function filterParticipantOpinions(opinions: BoardOpinion[]): BoardOpinion[] {
  const allowed = new Set(COLLABORATION_PARTICIPANTS);
  return COLLABORATION_PARTICIPANTS.map(
    (member) =>
      opinions.find((o) => o.member === member) ??
      ({
        member,
        opinion: "Sin posición registrada en esta sesión.",
        argumentsFor: [],
        argumentsAgainst: ["Sesión incompleta"],
        risks: ["Contexto insuficiente"],
        opportunities: [],
        confidence: 0.3,
        suggestedAction: "Re-ejecutar reunión",
        vote: "defer",
        source: "heuristic",
      } satisfies BoardOpinion)
  ).filter((o) => allowed.has(o.member));
}

function resolveSource(
  runtime: ExecutiveIntelligenceResult | null,
  boardSession: BoardSessionResult
): "ai" | "heuristic" | "mock" {
  if (runtime?.source) return runtime.source;
  if (boardSession.mockCount > 0 && boardSession.aiCount === 0) return "mock";
  if (boardSession.aiCount > 0) return "ai";
  return "heuristic";
}

function buildFounderObserver(
  consensus: ConsensusResult | null,
  ventureName: string
): FounderObserver {
  if (!consensus) {
    return {
      role: "Founder",
      title: "Fundador — Observador y decisor",
      stance: "La mesa ejecutiva aún no ha deliberado.",
      decisionPrompt: `¿Qué dirección quieres dar a ${ventureName}?`,
      recommendedAction: "Inicia la reunión ejecutiva para recibir recomendaciones.",
      awaitingDecision: true,
    };
  }

  const aligned =
    consensus.level === "UNANIMOUS" ||
    consensus.level === "HIGH_CONSENSUS" ||
    consensus.level === "MEDIUM_CONSENSUS";

  return {
    role: "Founder",
    title: "Fundador — Observador y decisor",
    stance: aligned
      ? `El board recomienda: ${consensus.finalDecision}`
      : `División en el board (${consensus.level.replace(/_/g, " ")}). Requiere tu criterio.`,
    decisionPrompt: aligned
      ? "¿Ratificas la recomendación del consenso ejecutivo?"
      : "¿Qué posición adoptas ante el desacuerdo del board?",
    recommendedAction: consensus.finalDecision,
    awaitingDecision: true,
  };
}

/**
 * Runs a structured executive meeting against the lab mock venture.
 * Integrates CEO runtime, board session, consensus engine, and decision graph.
 * Safe without API keys — never throws; returns partial results on failure.
 */
export async function runAiCollaborationLab(): Promise<AiCollaborationLabResult> {
  const started = Date.now();
  const venture = createLabMockVenture();
  const ventureId = LAB_MOCK_VENTURE_ID;
  const warnings: string[] = [];
  let error: string | undefined;
  let runtime: ExecutiveIntelligenceResult | null = null;
  let boardSession: BoardSessionResult | null = null;

  try {
    runtime = await runExecutiveIntelligence([venture]);
    warnings.push(...runtime.warnings);
  } catch (err) {
    error = err instanceof Error ? err.message : "Error en Executive Runtime";
    warnings.push(error);
  }

  try {
    boardSession = await runExecutiveBoardSession(venture);
    warnings.push(...boardSession.warnings);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Error en Board Session";
    warnings.push(msg);
    if (!error) error = msg;
  }

  const allOpinions = boardSession?.opinions ?? [];
  const participants = filterParticipantOpinions(allOpinions);
  const consensus = participants.length > 0 ? buildConsensus(participants) : runtime?.consensus ?? null;
  const decisionGraphNodes = getExecutiveGraphForVenture(ventureId).slice(0, 12);
  const source = boardSession
    ? resolveSource(runtime, boardSession)
    : runtime?.source ?? "heuristic";

  const fallbackUsed =
    runtime?.fallbackUsed ??
    (boardSession ? boardSession.heuristicCount > 0 || boardSession.mockCount > 0 : true);

  return {
    ventureId,
    ventureName: venture.name,
    agenda: `Revisión estratégica: ${venture.ideaText}`,
    sessionId: boardSession?.sessionId ?? runtime?.boardSessionId ?? null,
    participants,
    founder: buildFounderObserver(consensus, venture.name),
    consensus,
    decisionGraphNodes,
    boardSession: boardSession
      ? {
          sessionId: boardSession.sessionId,
          aiCount: boardSession.aiCount,
          heuristicCount: boardSession.heuristicCount,
          mockCount: boardSession.mockCount,
          latencyMs: boardSession.latencyMs,
        }
      : null,
    runtime,
    source,
    fallbackUsed,
    warnings: [...new Set(warnings)],
    latencyMs: Date.now() - started,
    generatedAt: new Date().toISOString(),
    error,
  };
}
