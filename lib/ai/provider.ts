import { buildMockProductPRD } from "./mocks/mock-product-prd";
import { buildProductPrompt } from "./prompts/product";
import type { KnowledgeRefSummary } from "./types/research";
import type { ProductPRD, ProductPRDRequest, ProductPRDResponse } from "./types/product";
import { validateProductPRDShape } from "./validate-product";
import { knowledgeStore } from "@/lib/knowledge/knowledge-store";
import type { KnowledgeEntryBase } from "@/lib/knowledge/types";
import { completeViaAIRuntime } from "@/lib/ai-runtime";
import { extractJSON } from "@/lib/ai-gateway/response-parser";
import { getConfiguredRuntimeProviders } from "@/lib/ai-runtime/providers";
import type { RuntimeProviderId } from "@/lib/ai-runtime/types";

export type AIProviderVendor = "anthropic" | "openai";

function toLegacyVendor(provider: RuntimeProviderId): AIProviderVendor | undefined {
  if (provider === "anthropic" || provider === "openai") return provider;
  return undefined;
}

function resolveKnowledgeEntries(refs: KnowledgeRefSummary[] = []): KnowledgeEntryBase[] {
  return refs
    .map((ref) => knowledgeStore.getById(ref.id))
    .filter((entry): entry is KnowledgeEntryBase => entry !== null);
}

function mockResponse(
  input: ProductPRDRequest,
  usedKnowledgeRefs: KnowledgeRefSummary[],
  usedResearch: boolean
): ProductPRDResponse {
  return {
    data: buildMockProductPRD(input),
    source: "mock",
    usedResearch,
    usedKnowledgeRefs,
    fallbackUsed: true,
  };
}

export function isAIConfigured(): boolean {
  return getConfiguredRuntimeProviders().some((id) => id !== "mock");
}

export function getActiveProviderVendor(): AIProviderVendor | null {
  const configured = getConfiguredRuntimeProviders().filter((id) => id !== "mock");
  const first = configured[0];
  return first ? (toLegacyVendor(first) ?? null) : null;
}

export async function generateProductPRD(input: ProductPRDRequest): Promise<ProductPRDResponse> {
  const usedKnowledgeRefs = input.knowledgeRefs ?? [];
  const usedResearch = Boolean(input.researchReport);
  const knowledgeEntries = resolveKnowledgeEntries(usedKnowledgeRefs);

  if (!isAIConfigured()) {
    return mockResponse(input, usedKnowledgeRefs, usedResearch);
  }

  try {
    const { system, user } = buildProductPrompt(input, knowledgeEntries);
    const runtime = await completeViaAIRuntime({
      task: "product",
      system,
      user,
      context: {
        sources: ["product", "research", "knowledge", "memory"],
        knowledgeRefs: usedKnowledgeRefs,
        researchSummary: input.researchReport
          ? `Research available for ${input.projectName}`
          : undefined,
      },
    });
    const parsed = JSON.parse(extractJSON(runtime.output)) as ProductPRD;

    if (!validateProductPRDShape(parsed)) {
      throw new Error("Invalid PRD structure from AI provider");
    }

    const legacyProvider = toLegacyVendor(runtime.provider);

    return {
      data: parsed,
      source: "ai",
      provider: legacyProvider,
      usedResearch,
      usedKnowledgeRefs,
      fallbackUsed: runtime.fallbackUsed || runtime.provider === "mock",
    };
  } catch {
    return mockResponse(input, usedKnowledgeRefs, usedResearch);
  }
}
