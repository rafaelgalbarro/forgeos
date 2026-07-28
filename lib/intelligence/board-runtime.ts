/** Executive Board runtime — orchestrated opinions per member (Epic 3.2). */

import type { VentureProject } from "@/lib/domain/venture";
import { runBoardAiTask } from "@/lib/platform/intelligence/board-ai-adapter";
import type { BoardMemberId, BoardOutput } from "@/lib/ai-orchestration/types";
import { boardOutputToOpinion, type BoardOpinion } from "./consensus-engine";

export const EXECUTIVE_BOARD_MEMBERS: BoardMemberId[] = [
  "CEO",
  "CTO",
  "CPO",
  "CMO",
  "CFO",
  "COO",
  "Legal",
  "Growth",
  "Research",
  "UX",
  "Architecture",
  "Operations",
];

export interface BoardSessionResult {
  sessionId: string;
  ventureId: string;
  opinions: BoardOpinion[];
  warnings: string[];
  aiCount: number;
  heuristicCount: number;
  mockCount: number;
  latencyMs: number;
}

function heuristicBoardOpinion(member: BoardMemberId, venture: VentureProject): BoardOpinion {
  const hasDiscovery = (venture.discoveryContext?.answers.length ?? 0) >= 2;
  const hasResearch = !!venture.researchReport;
  const stance = hasDiscovery && hasResearch
    ? "Validación suficiente para avanzar con cautela."
    : "Falta contexto — priorizar Discovery y Research.";

  return {
    member,
    opinion: stance,
    argumentsFor: hasDiscovery ? ["Discovery avanzado"] : ["Idea registrada"],
    argumentsAgainst: hasResearch ? [] : ["Research pendiente"],
    risks: hasResearch ? ["Ejecución"] : ["Build prematuro"],
    opportunities: ["Especialización de nicho"],
    confidence: hasDiscovery ? 0.65 : 0.45,
    suggestedAction: hasResearch ? "Definir PRD" : "Completar Research",
    vote: hasDiscovery ? "approve_with_conditions" : "defer",
    source: "heuristic",
  };
}

export async function runExecutiveBoardSession(
  venture: VentureProject
): Promise<BoardSessionResult> {
  const started = Date.now();
  const sessionId = crypto.randomUUID();
  const warnings: string[] = [];
  let aiCount = 0;
  let heuristicCount = 0;
  let mockCount = 0;

  const results = await Promise.all(
    EXECUTIVE_BOARD_MEMBERS.map(async (member) => {
      try {
        const result = await runBoardAiTask("BOARD_DEBATE", member, venture);
        const source: BoardOpinion["source"] = result.mockUsed
          ? "mock"
          : result.fallbackUsed
            ? "heuristic"
            : "ai";

        if (source === "ai") aiCount += 1;
        else if (source === "mock") mockCount += 1;
        else heuristicCount += 1;

        warnings.push(...result.warnings);
        return boardOutputToOpinion(result.output as BoardOutput, member, source);
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          console.warn(`[Board Runtime] ${member} failed:`, error);
        }
        heuristicCount += 1;
        warnings.push(`${member}: fallback heurístico`);
        return heuristicBoardOpinion(member, venture);
      }
    })
  );

  return {
    sessionId,
    ventureId: venture.id,
    opinions: results,
    warnings: [...new Set(warnings)],
    aiCount,
    heuristicCount,
    mockCount,
    latencyMs: Date.now() - started,
  };
}
