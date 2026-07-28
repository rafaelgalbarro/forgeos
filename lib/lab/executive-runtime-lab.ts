/** Executive Runtime Lab — isolated orchestration for /lab/executive-runtime. */

import { runExecutiveIntelligence, type ExecutiveIntelligenceResult } from "@/lib/ceo-office/executive-runtime";
import { getExecutiveGraphForVenture } from "@/lib/ai-orchestration/decision-graph-writer";
import {
  getExecutiveRuntimeMemory,
  type BoardReviewRecord,
  type CeoReviewRecord,
  type ExecutiveDecisionRecord,
} from "@/lib/ai-orchestration/executive-memory-writer";
import { getExecutiveObservations, type ExecutiveObservation } from "@/lib/ai-orchestration/observability";
import { TASK_REGISTRY } from "@/lib/ai-orchestration/task-registry";
import type {
  BoardOutput,
  CeoOutput,
  ConsensusRecord,
  ExecutiveGraphNode,
} from "@/lib/ai-orchestration/types";
import {
  EXECUTIVE_BOARD_MEMBERS,
  type BoardSessionResult,
} from "@/lib/intelligence/board-runtime";
import type { BoardOpinion, ConsensusResult } from "@/lib/intelligence/consensus-engine";
import { runBoardAiTask } from "@/lib/platform/intelligence/board-ai-adapter";
import { createLabMockVenture, LAB_MOCK_VENTURE_ID } from "./mock-venture";

export interface ExecutiveRuntimeLabMemorySnapshot {
  ceoReviews: CeoReviewRecord[];
  boardReviews: BoardReviewRecord[];
  consensusHistory: ConsensusRecord[];
  executiveDecisions: ExecutiveDecisionRecord[];
}

export interface BoardConsensusTaskResult {
  output: BoardOutput;
  provider: string;
  fallbackUsed: boolean;
  mockUsed: boolean;
  warnings: string[];
}

export interface ExecutiveRuntimeLabResult {
  ventureId: string;
  runtime: ExecutiveIntelligenceResult | null;
  ceoBrief: CeoOutput | null;
  boardMembers: typeof EXECUTIVE_BOARD_MEMBERS;
  boardSession: Pick<BoardSessionResult, "sessionId" | "opinions" | "aiCount" | "heuristicCount" | "mockCount"> | null;
  boardOpinions: BoardOpinion[];
  consensus: ConsensusResult | null;
  boardConsensusTask: BoardConsensusTaskResult | null;
  decisionGraphNodes: ExecutiveGraphNode[];
  memoryWrites: ExecutiveRuntimeLabMemorySnapshot;
  observations: ExecutiveObservation[];
  provider?: string;
  fallbackUsed: boolean;
  warnings: string[];
  latencyMs: number;
  error?: string;
}

function filterMemoryForVenture(ventureId: string): ExecutiveRuntimeLabMemorySnapshot {
  const memory = getExecutiveRuntimeMemory();
  const match = (r: { ventureId: string }) => r.ventureId === ventureId;

  return {
    ceoReviews: memory.ceoReviews.filter(match).slice(0, 5),
    boardReviews: memory.boardReviews.filter(match).slice(0, 5),
    consensusHistory: memory.consensusHistory.filter(match).slice(0, 5),
    executiveDecisions: memory.executiveDecisions.filter(match).slice(0, 5),
  };
}

/**
 * Runs the full executive pipeline against a lab mock venture.
 * Safe without API keys — never throws; returns partial results on failure.
 */
export async function runExecutiveRuntimeLab(): Promise<ExecutiveRuntimeLabResult> {
  const started = Date.now();
  const venture = createLabMockVenture();
  const ventureId = LAB_MOCK_VENTURE_ID;
  const warnings: string[] = [];

  let runtime: ExecutiveIntelligenceResult | null = null;
  let error: string | undefined;

  try {
    runtime = await runExecutiveIntelligence([venture]);
    warnings.push(...runtime.warnings);
  } catch (err) {
    error = err instanceof Error ? err.message : "Error desconocido en Executive Runtime";
    warnings.push(error);
  }

  let boardConsensusTask: BoardConsensusTaskResult | null = null;

  if ("BOARD_CONSENSUS" in TASK_REGISTRY) {
    try {
      const result = await runBoardAiTask("BOARD_CONSENSUS", "CEO", venture);
      boardConsensusTask = {
        output: result.output as BoardOutput,
        provider: result.provider,
        fallbackUsed: result.fallbackUsed,
        mockUsed: result.mockUsed,
        warnings: result.warnings,
      };
      warnings.push(...result.warnings);
    } catch (err) {
      warnings.push(
        `BOARD_CONSENSUS: ${err instanceof Error ? err.message : "fallback omitido"}`
      );
    }
  }

  const memoryWrites = filterMemoryForVenture(ventureId);
  const latestBoard = memoryWrites.boardReviews[0] ?? null;
  const boardOpinions = latestBoard?.opinions ?? [];
  const decisionGraphNodes = getExecutiveGraphForVenture(ventureId).slice(0, 20);
  const observations = getExecutiveObservations(ventureId).slice(0, 10);

  const boardSession = latestBoard
    ? {
        sessionId: latestBoard.sessionId,
        opinions: boardOpinions,
        aiCount: boardOpinions.filter((o) => o.source === "ai").length,
        heuristicCount: boardOpinions.filter((o) => o.source === "heuristic").length,
        mockCount: boardOpinions.filter((o) => o.source === "mock").length,
      }
    : null;

  return {
    ventureId,
    runtime,
    ceoBrief: runtime?.ceo ?? null,
    boardMembers: EXECUTIVE_BOARD_MEMBERS,
    boardSession,
    boardOpinions,
    consensus: runtime?.consensus ?? null,
    boardConsensusTask,
    decisionGraphNodes,
    memoryWrites,
    observations,
    provider: runtime?.provider,
    fallbackUsed: runtime?.fallbackUsed ?? true,
    warnings: [...new Set(warnings)],
    latencyMs: runtime?.latencyMs ?? Date.now() - started,
    error,
  };
}
