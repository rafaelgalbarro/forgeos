import { fetchResearchReport } from "@/lib/generation/fetch-research";
import type { KnowledgeRefSummary } from "@/lib/ai/types/research";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { AppCategory } from "@/lib/types/app";
import { createStubWorker } from "../create-stub-worker";
import type { WorkerContext, WorkerResult } from "../types";

async function runResearch(context: WorkerContext): Promise<WorkerResult> {
  const minDurationMs = 2000;
  const start = Date.now();
  const knowledgeRefs = (context.metadata.knowledgeRefs as KnowledgeRefSummary[] | undefined) ?? [];
  const discoveryContext = (context.metadata.discoveryContext as DiscoveryContext | undefined) ??
    context.venture.discoveryContext ??
    undefined;

  try {
    const response = await fetchResearchReport({
      projectName: context.venture.name,
      ideaText: context.venture.ideaText,
      category: context.venture.category as AppCategory,
      targetAudience: context.venture.targetAudience,
      knowledgeRefs,
      discoveryContext,
    });

    const remaining = Math.max(0, minDurationMs - (Date.now() - start));
    if (remaining > 0) {
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }

    return {
      success: true,
      output: {
        researchReport: response,
        provider: response.provider ?? response.source,
        usedKnowledgeRefs: response.usedKnowledgeRefs,
        fallbackUsed: response.fallbackUsed,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Research worker failed",
    };
  }
}

export const researchWorker = createStubWorker({
  id: "research",
  name: "Research",
  role: "Mercado y competidores",
  durationMs: 2000,
  run: runResearch,
});
