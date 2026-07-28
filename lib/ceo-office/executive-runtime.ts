/** Executive Intelligence Runtime — full pipeline (Epic 3.2). */

import type { VentureProject } from "@/lib/domain/venture";
import { buildPortfolioMemory, getPortfolioMemory } from "@/lib/intelligence-layer/portfolio-memory";
import { runCeoAiTask, buildCeoVentureContext } from "@/lib/platform/ceo/ai-adapter";
import type { CeoOutput } from "@/lib/ai-orchestration/types";
import { writeConsensusDecision } from "@/lib/ai-orchestration/decision-graph-writer";
import {
  appendLessonLearned,
  writeBoardReview,
  writeCeoReview,
  writeConsensusHistory,
  writeExecutiveDecision,
} from "@/lib/ai-orchestration/executive-memory-writer";
import {
  estimateTokens,
  registerExecutiveObservation,
} from "@/lib/ai-orchestration/observability";
import { buildConsensus } from "@/lib/intelligence/consensus-engine";
import { runExecutiveBoardSession } from "@/lib/intelligence/board-runtime";
import {
  getPortfolioHighlights,
  type PortfolioHighlights,
} from "@/lib/ceo-office/portfolio-ranking";

export type ExecutiveSource = "ai" | "heuristic" | "mock";

export interface ExecutiveIntelligenceResult {
  source: ExecutiveSource;
  ceo: CeoOutput | null;
  consensus: ReturnType<typeof buildConsensus> | null;
  portfolioHighlights: PortfolioHighlights;
  focusVentureId: string | null;
  provider?: string;
  model?: string;
  fallbackUsed: boolean;
  warnings: string[];
  boardSessionId?: string;
  decisionId?: string;
  latencyMs: number;
  generatedAt: string;
}

function focusVenture(ventures: VentureProject[]): VentureProject | null {
  if (ventures.length === 0) return null;
  return [...ventures].sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  )[0];
}

function resolveSource(
  mockUsed: boolean,
  fallbackUsed: boolean
): ExecutiveSource {
  if (mockUsed) return "mock";
  if (fallbackUsed) return "heuristic";
  return "ai";
}

/**
 * Founder → CEO AI → Executive Board → Consensus → Decision Graph → Memory
 */
export async function runExecutiveIntelligence(
  ventures: VentureProject[]
): Promise<ExecutiveIntelligenceResult> {
  const started = Date.now();
  const warnings: string[] = [];
  const portfolioHighlights = getPortfolioHighlights(ventures);

  if (ventures.length === 0) {
    return {
      source: "heuristic",
      ceo: null,
      consensus: null,
      portfolioHighlights,
      focusVentureId: null,
      fallbackUsed: false,
      warnings: [],
      latencyMs: Date.now() - started,
      generatedAt: new Date().toISOString(),
    };
  }

  buildPortfolioMemory(ventures);
  const focus = focusVenture(ventures);
  if (!focus) {
    return {
      source: "heuristic",
      ceo: null,
      consensus: null,
      portfolioHighlights,
      focusVentureId: null,
      fallbackUsed: false,
      warnings: [],
      latencyMs: Date.now() - started,
      generatedAt: new Date().toISOString(),
    };
  }

  let ceoOutput: CeoOutput | null = null;
  let provider: string | undefined;
  let model: string | undefined;
  let fallbackUsed = false;
  let mockUsed = false;
  let decisionId: string | undefined;

  try {
    const ceoResult = await runCeoAiTask("CEO_BRIEF", {
      ...buildCeoVentureContext(focus),
      portfolioMemory: getPortfolioMemory(),
    });
    ceoOutput = ceoResult.output;
    provider = ceoResult.provider;
    model = ceoResult.model;
    fallbackUsed = ceoResult.fallbackUsed;
    mockUsed = ceoResult.mockUsed;
    decisionId = ceoResult.decisionId;
    warnings.push(...ceoResult.warnings);

    writeCeoReview(focus.id, "CEO_BRIEF", ceoOutput);

    registerExecutiveObservation({
      task: "CEO_BRIEF",
      provider: ceoResult.provider,
      model: ceoResult.model,
      latencyMs: ceoResult.latencyMs,
      estimatedTokens: estimateTokens(0, ceoResult.raw.length),
      costEstimate: ceoResult.costEstimate,
      fallbackUsed: ceoResult.fallbackUsed,
      warnings: ceoResult.warnings,
      ventureId: focus.id,
      decisionId: ceoResult.decisionId,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Executive Runtime] CEO failed:", error);
    }
    warnings.push("CEO AI fallback — sin output estructurado.");
    fallbackUsed = true;
  }

  let boardSessionId: string | undefined;
  let consensus: ReturnType<typeof buildConsensus> | null = null;

  try {
    const boardSession = await runExecutiveBoardSession(focus);
    boardSessionId = boardSession.sessionId;
    warnings.push(...boardSession.warnings);

    writeBoardReview(focus.id, boardSession.sessionId, boardSession.opinions);
    consensus = buildConsensus(boardSession.opinions);
    const consensusRecord = writeConsensusHistory(
      focus.id,
      consensus,
      boardSession.sessionId
    );

    const graphNode = writeConsensusDecision(
      focus.id,
      consensus.finalDecision,
      consensus.rationale,
      consensus.confidence,
      consensus.level,
      boardSession.sessionId
    );

    writeExecutiveDecision(
      focus.id,
      "Executive consensus",
      consensus.finalDecision,
      consensus.confidence,
      graphNode.id
    );

    if (consensus.level === "CONFLICT" || consensus.level === "LOW_CONSENSUS") {
      appendLessonLearned(
        `Board split on ${focus.name}: ${consensus.minorityOpinions[0] ?? "review minority views"}`
      );
    }

    registerExecutiveObservation({
      task: "BOARD_SESSION",
      provider:
        boardSession.mockCount > 0 && boardSession.aiCount === 0
          ? "mock"
          : boardSession.aiCount > 0
            ? "mixed"
            : "heuristic",
      model: model ?? "orchestration",
      latencyMs: boardSession.latencyMs,
      estimatedTokens: boardSession.opinions.length * 200,
      costEstimate: 0,
      fallbackUsed: boardSession.heuristicCount > 0 || boardSession.mockCount > 0,
      warnings: boardSession.warnings,
      ventureId: focus.id,
      boardSessionId: boardSession.sessionId,
      decisionId: consensusRecord.id,
    });

    registerExecutiveObservation({
      task: "CONSENSUS",
      provider: "heuristic",
      model: "consensus-engine",
      latencyMs: 5,
      estimatedTokens: 50,
      costEstimate: 0,
      fallbackUsed: false,
      warnings: [],
      ventureId: focus.id,
      boardSessionId: boardSession.sessionId,
      decisionId: consensusRecord.id,
    });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[Executive Runtime] Board/consensus failed:", error);
    }
    warnings.push("Board session fallback — consenso heurístico omitido.");
  }

  const source = resolveSource(mockUsed, fallbackUsed);

  registerExecutiveObservation({
    task: "EXECUTIVE_RUNTIME",
    provider: source === "ai" ? (provider as "mock") : source,
    model: model ?? "executive-runtime",
    latencyMs: Date.now() - started,
    estimatedTokens: 0,
    costEstimate: 0,
    fallbackUsed,
    warnings,
    ventureId: focus.id,
    boardSessionId,
    decisionId,
  });

  return {
    source,
    ceo: ceoOutput,
    consensus,
    portfolioHighlights,
    focusVentureId: focus.id,
    provider,
    model,
    fallbackUsed,
    warnings,
    boardSessionId,
    decisionId,
    latencyMs: Date.now() - started,
    generatedAt: new Date().toISOString(),
  };
}
