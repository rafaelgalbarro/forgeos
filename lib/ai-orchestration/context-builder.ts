/** ForgeOS AI Orchestration — context builder. */

import { formatBrainContextForPrompt } from "@/lib/brain/brain-context";
import type { BrainWorkerId } from "@/lib/brain/brain-types";
import { getTaskDefinition } from "./task-registry";
import { ContextBuildError } from "./orchestration-errors";
import type { BuiltContext, OrchestrationTaskId, VentureOrchestrationContext } from "./types";

function workerForTask(taskId: OrchestrationTaskId): BrainWorkerId {
  if (taskId.startsWith("CEO_")) return "ceo";
  if (taskId.startsWith("BOARD_")) return "founder";
  if (taskId.startsWith("BUILD_")) return "product";
  return "ceo";
}

function section(label: string, content: string | undefined | null): string | null {
  if (!content?.trim()) return null;
  return `## ${label}\n${content.trim()}`;
}

export function buildOrchestrationContext(
  taskId: OrchestrationTaskId,
  ctx: VentureOrchestrationContext
): BuiltContext {
  const def = getTaskDefinition(taskId);
  const venture = ctx.venture;
  const idea = ctx.idea ?? venture?.ideaText ?? venture?.description ?? "";
  const ventureId = ctx.ventureId ?? venture?.id;

  if (!idea.trim() && def.minimumContext.includes("idea")) {
    throw new ContextBuildError(`Task ${taskId} requires at least an idea in context.`);
  }

  const sources: string[] = [];
  const blocks: string[] = [];

  blocks.push(
    `Task: ${taskId}\nObjective: ${def.objective}\nProgram: ${def.program}\nVenture: ${venture?.name ?? ventureId ?? "unknown"}`
  );

  if (idea) {
    blocks.push(section("Idea", idea)!);
    sources.push("idea");
  }

  if (ctx.discoveryContext?.answers?.length) {
    const discoveryLines = ctx.discoveryContext.answers
      .map((a) => `- ${a.questionId}: ${Array.isArray(a.answer) ? a.answer.join(", ") : a.answer}`)
      .join("\n");
    blocks.push(section("Discovery Context (priority)", discoveryLines)!);
    sources.push("discoveryContext");
  }

  if (ctx.researchReport) {
    const competitors = ctx.researchReport.competitors
      .map((c) => c.name)
      .join(", ");
    blocks.push(
      section(
        "Research",
        `${ctx.researchReport.marketSummary}\nCompetitors: ${competitors}`
      )!
    );
    sources.push("researchReport");
  }

  if (ctx.productPRD) {
    blocks.push(section("Product PRD", ctx.productPRD.executiveSummary)!);
    sources.push("productPRD");
  }

  if (ctx.ventureSimulatorResult) {
    blocks.push(
      section(
        "Venture Simulator",
        `Score: ${ctx.ventureSimulatorResult.startupScore}\nRecommendation: ${ctx.ventureSimulatorResult.recommendationLabel}`
      )!
    );
    sources.push("ventureSimulatorResult");
  }

  if (ctx.buildPlan) {
    blocks.push(section("Build Plan", ctx.buildPlan)!);
    sources.push("buildPlan");
  }

  if (ctx.knowledgeRefs?.length) {
    blocks.push(
      section(
        "Knowledge Refs",
        ctx.knowledgeRefs.map((r) => `- ${r.title} (${r.domain})`).join("\n")
      )!
    );
    sources.push("knowledgeRefs");
  }

  if (ctx.ventureMemory) {
    blocks.push(section("Venture Memory", JSON.stringify(ctx.ventureMemory.assumptions ?? []))!);
    sources.push("ventureMemory");
  }

  if (ctx.decisionGraph?.length) {
    blocks.push(
      section(
        "Decision Graph",
        ctx.decisionGraph.map((d) => `- ${d.title}: ${d.status}`).join("\n")
      )!
    );
    sources.push("decisionGraph");
  }

  if (ctx.portfolioMemory) {
    blocks.push(section("Portfolio Memory", `Ventures: ${ctx.portfolioMemory.totalVentures}`)!);
    sources.push("portfolioMemory");
  }

  if (ctx.founderMemory) {
    blocks.push(section("Founder Memory", JSON.stringify(ctx.founderMemory))!);
    sources.push("founderMemory");
  }

  const brain =
    ctx.brainContext ?? formatBrainContextForPrompt(workerForTask(taskId));
  if (brain) {
    blocks.push(section("Brain Context", brain)!);
    sources.push("brainContext");
  }

  if (ctx.boardMember) {
    blocks.push(
      section(
        "Board Member Role",
        `You are acting as ${ctx.boardMember}. Adapt your perspective to this executive role.`
      )!
    );
    sources.push("boardMember");
  }

  const system = `You are ForgeOS AI Orchestration for task ${taskId}.
Respond in valid JSON matching the expected schema for this task.
Discovery Context and explicit user decisions override heuristics.`;

  const user = blocks.filter(Boolean).join("\n\n");
  const inputSize = system.length + user.length;

  return { system, user, inputSize, sources };
}
