/** ForgeOS AI Runtime — Context Engine (RC3). */

import { getAllAiExecutions } from "@/lib/ai-orchestration/memory-writer";
import { knowledgeStore } from "@/lib/knowledge/knowledge-store";
import type { AIRuntimeContextInput, ContextSource } from "../types";

export interface BuiltAIContext {
  ventureId?: string;
  ventureName?: string;
  blocks: { source: ContextSource; content: string }[];
  metadata: Record<string, unknown>;
}

const DEFAULT_SOURCES: ContextSource[] = [
  "memory",
  "knowledge",
  "decision-graph",
  "build-context",
  "timeline",
  "portfolio",
];

export function buildAIContext(input?: AIRuntimeContextInput): BuiltAIContext {
  const sources = input?.sources ?? DEFAULT_SOURCES;
  const blocks: BuiltAIContext["blocks"] = [];

  if (sources.includes("founder") || sources.includes("ceo")) {
    blocks.push({
      source: "ceo",
      content: "Founder: Rafael. CEO AI actúa como Director General del portfolio.",
    });
  }

  if (sources.includes("portfolio")) {
    blocks.push({
      source: "portfolio",
      content: `Portfolio activo${input?.ventureName ? `: ${input.ventureName}` : ""}.`,
    });
  }

  if (sources.includes("research") && input?.researchSummary) {
    blocks.push({ source: "research", content: input.researchSummary });
  }

  if (sources.includes("product") && input?.productSummary) {
    blocks.push({ source: "product", content: input.productSummary });
  }

  if (sources.includes("build-context") && input?.buildContextSummary) {
    blocks.push({ source: "build-context", content: input.buildContextSummary });
  }

  if (sources.includes("build-dna") && input?.buildDnaSummary) {
    blocks.push({ source: "build-dna", content: input.buildDnaSummary });
  }

  if (sources.includes("knowledge") && input?.knowledgeRefs?.length) {
    const entries = input.knowledgeRefs
      .map((ref) => {
        const e = knowledgeStore.getById(ref.id);
        return e ? `- ${e.title}: ${e.description?.slice(0, 200) ?? ""}` : null;
      })
      .filter(Boolean);
    if (entries.length) {
      blocks.push({ source: "knowledge", content: `Knowledge:\n${entries.join("\n")}` });
    }
  }

  if (sources.includes("memory") && input?.ventureId) {
    const execs = getAllAiExecutions()
      .filter((e) => e.ventureId === input.ventureId)
      .slice(0, 3);
    if (execs.length) {
      blocks.push({
        source: "memory",
        content: `Recent AI memory:\n${execs.map((e) => `- ${e.taskId} via ${e.provider} (${e.latencyMs}ms)`).join("\n")}`,
      });
    }
  }

  if (sources.includes("runtime-history")) {
    blocks.push({
      source: "runtime-history",
      content: "Runtime history available via shared ForgeOS memory layer.",
    });
  }

  if (sources.includes("timeline")) {
    blocks.push({
      source: "timeline",
      content: "Venture timeline events inform prioritization and context.",
    });
  }

  if (sources.includes("decision-graph")) {
    blocks.push({
      source: "decision-graph",
      content: "Executive decision graph informs recommendations and constraints.",
    });
  }

  if (sources.includes("workers")) {
    blocks.push({
      source: "workers",
      content: "Workers (Research, Product, Marketing, Build) contribute structured outputs.",
    });
  }

  return {
    ventureId: input?.ventureId,
    ventureName: input?.ventureName,
    blocks,
    metadata: input?.metadata ?? {},
  };
}

export function contextBlocksToPromptSection(blocks: BuiltAIContext["blocks"]): string {
  if (blocks.length === 0) return "";
  return blocks.map((b) => `## ${b.source}\n${b.content}`).join("\n\n");
}
