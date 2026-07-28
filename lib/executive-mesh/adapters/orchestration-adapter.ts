/** Executive Mesh — adapter to ai-orchestration (no circular deps). */

import type { VentureProject } from "@/lib/domain/venture";
import { runCeoAiTask, buildCeoVentureContext } from "@/lib/platform/ceo/ai-adapter";
import { runBoardAiTask } from "@/lib/platform/intelligence/board-ai-adapter";
import type { CeoOutput } from "@/lib/ai-orchestration/types";
import { writeConsensusDecision } from "@/lib/ai-orchestration/decision-graph-writer";
import { buildConsensus, type BoardOpinion } from "@/lib/intelligence/consensus-engine";
import { runExecutiveBoardSession } from "@/lib/intelligence/board-runtime";

export async function meshRunCeoBrief(venture: VentureProject): Promise<{
  output: CeoOutput | null;
  fallbackUsed: boolean;
  warnings: string[];
}> {
  try {
    const ctx = buildCeoVentureContext(venture);
    const result = await runCeoAiTask("CEO_BRIEF", ctx);
    return {
      output: result.output as CeoOutput,
      fallbackUsed: result.fallbackUsed || result.mockUsed,
      warnings: result.warnings,
    };
  } catch (err) {
    return {
      output: null,
      fallbackUsed: true,
      warnings: [err instanceof Error ? err.message : String(err)],
    };
  }
}

export async function meshRunBoardSession(venture: VentureProject): Promise<{
  opinions: BoardOpinion[];
  sessionId: string;
  fallbackUsed: boolean;
  warnings: string[];
}> {
  const session = await runExecutiveBoardSession(venture);
  return {
    opinions: session.opinions,
    sessionId: session.sessionId,
    fallbackUsed: session.mockCount > 0 || session.heuristicCount > 0,
    warnings: session.warnings,
  };
}

export async function meshRunSpecialistReview(
  venture: VentureProject,
  member: "CTO" | "CPO" | "CFO" | "Legal" | "Architecture"
): Promise<{ opinion: string; confidence: number; warnings: string[] }> {
  try {
    const result = await runBoardAiTask("BOARD_DEBATE", member, venture);
    const out = result.output as { opinion?: string; confidence?: number };
    return {
      opinion: out.opinion ?? "Revisión completada.",
      confidence: out.confidence ?? 0.7,
      warnings: result.warnings,
    };
  } catch (err) {
    return {
      opinion: `${member}: revisión heurística completada.`,
      confidence: 0.6,
      warnings: [err instanceof Error ? err.message : String(err)],
    };
  }
}

export function meshBuildConsensus(opinions: BoardOpinion[]) {
  return buildConsensus(opinions);
}

export function meshWriteConsensusDecision(
  ventureId: string,
  consensus: ReturnType<typeof buildConsensus>,
  sessionId: string
): string {
  const node = writeConsensusDecision(
    ventureId,
    consensus.finalDecision,
    consensus.rationale,
    consensus.confidence,
    consensus.level,
    sessionId
  );
  return node.id;
}
