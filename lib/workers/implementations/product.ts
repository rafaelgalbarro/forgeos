import { fetchProductPRD } from "@/lib/generation/fetch-product-prd";
import type { KnowledgeRefSummary } from "@/lib/ai/types/research";
import type { ResearchReportResponse } from "@/lib/ai/types/research";
import type { DiscoveryContext } from "@/lib/discovery/types";
import type { AppCategory } from "@/lib/types/app";
import { createStubWorker } from "../create-stub-worker";
import type { WorkerContext, WorkerResult } from "../types";

async function runProduct(context: WorkerContext): Promise<WorkerResult> {
  const minDurationMs = 2800;
  const start = Date.now();
  const knowledgeRefs = (context.metadata.knowledgeRefs as KnowledgeRefSummary[] | undefined) ?? [];
  const researchPayload = context.metadata.researchReport as ResearchReportResponse | undefined;
  const researchReport = researchPayload?.data ?? null;
  const discoveryContext = (context.metadata.discoveryContext as DiscoveryContext | undefined) ??
    context.venture.discoveryContext ??
    undefined;

  try {
    const response = await fetchProductPRD({
      name: context.venture.name,
      description: context.venture.ideaText,
      category: context.venture.category as AppCategory,
      targetAudience: context.venture.targetAudience,
      researchReport,
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
        productPRD: response,
        provider: response.provider ?? response.source,
        usedResearch: response.usedResearch,
        usedKnowledgeRefs: response.usedKnowledgeRefs,
        fallbackUsed: response.fallbackUsed,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Product worker failed",
    };
  }
}

export const productWorker = createStubWorker({
  id: "product",
  name: "Product",
  role: "PRD y roadmap",
  durationMs: 2800,
  run: runProduct,
});
