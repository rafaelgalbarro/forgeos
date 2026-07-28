/** ForgeOS Platform Intelligence — Board AI adapter (Epic 3.1). */

import type { VentureProject } from "@/lib/domain/venture";
import { formatBrainContextForPrompt } from "@/lib/brain/brain-context";
import { getDecisionsForVenture } from "@/lib/intelligence-layer/decision-engine";
import { getVentureMemory } from "@/lib/intelligence-layer/venture-memory";
import { runOrchestratedAiTask } from "@/lib/ai-orchestration/task-runner";
import type {
  BoardMemberId,
  BoardOutput,
  OrchestratedAiResult,
  OrchestrationTaskId,
  VentureOrchestrationContext,
} from "@/lib/ai-orchestration/types";

export type BoardAiTaskId = Extract<
  OrchestrationTaskId,
  "BOARD_DEBATE" | "BOARD_VOTE" | "BOARD_CONSENSUS"
>;

const MEMBER_FOCUS: Record<BoardMemberId, string> = {
  CEO: "Strategic vision, portfolio impact, founder alignment.",
  CTO: "Technical feasibility, architecture, scalability, security.",
  CPO: "Product-market fit, UX, roadmap, user value.",
  CMO: "Positioning, channels, brand, acquisition.",
  CFO: "Unit economics, runway, pricing, financial risk.",
  COO: "Operations, execution, team capacity, delivery.",
  Legal: "Compliance, IP, contracts, regulatory risk.",
  Growth: "Funnels, retention, experiments, CAC/LTV.",
  Research: "Market evidence, competitive intelligence, validation signals.",
  UX: "User journeys, usability, accessibility, delight.",
  Architecture: "System design, modularity, technical debt, integration.",
  Operations: "Process reliability, SLAs, incident response, tooling.",
  Data: "Metrics, analytics, evidence, experimentation.",
};

export function buildBoardVentureContext(
  venture: VentureProject,
  member: BoardMemberId,
  extra?: Partial<VentureOrchestrationContext>
): VentureOrchestrationContext {
  const roleFocus = MEMBER_FOCUS[member];
  return {
    venture,
    ventureId: venture.id,
    idea: venture.ideaText,
    discoveryContext: venture.discoveryContext ?? null,
    researchReport: venture.researchReport ?? null,
    productPRD: venture.productPRD ?? null,
    ventureSimulatorResult: venture.ventureSimulatorResult ?? null,
    decisionGraph: getDecisionsForVenture(venture.id),
    ventureMemory: getVentureMemory(venture.id) ?? null,
    boardMember: member,
    brainContext: `${formatBrainContextForPrompt("founder")}\n\nBoard role focus: ${roleFocus}`,
    ...extra,
  };
}

export async function runBoardAiTask(
  task: BoardAiTaskId,
  member: BoardMemberId,
  ventureContext: VentureOrchestrationContext | VentureProject
): Promise<OrchestratedAiResult<BoardOutput>> {
  const ctx =
    "id" in ventureContext && "sections" in ventureContext
      ? buildBoardVentureContext(ventureContext, member)
      : { ...ventureContext, boardMember: member };

  return runOrchestratedAiTask<BoardOutput>(task, ctx);
}
