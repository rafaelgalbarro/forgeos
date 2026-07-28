import { knowledgeStore } from "@/lib/knowledge/knowledge-store";
import type { KnowledgeEntryBase } from "@/lib/knowledge/types";
import { buildMockResearchReport } from "./mocks/mock-research";
import { buildResearchPrompt } from "./prompts/research";
import { validateResearchReportShape } from "./validate-research";
import type {
  KnowledgeRefSummary,
  ResearchReport,
  ResearchReportResponse,
  ResearchRequest,
} from "./types/research";
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
  const resolved: KnowledgeEntryBase[] = [];
  for (const ref of refs) {
    const entry = knowledgeStore.getById(ref.id);
    if (entry) resolved.push(entry);
  }
  return resolved;
}

function mockResponse(
  input: ResearchRequest,
  knowledgeEntries: KnowledgeEntryBase[],
  usedKnowledgeRefs: KnowledgeRefSummary[],
  fallbackUsed: boolean
): ResearchReportResponse {
  return {
    data: buildMockResearchReport(input, knowledgeEntries),
    source: "mock",
    usedKnowledgeRefs,
    fallbackUsed,
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

export async function generateResearch(input: ResearchRequest): Promise<ResearchReportResponse> {
  const usedKnowledgeRefs = input.knowledgeRefs ?? [];
  const knowledgeEntries = resolveKnowledgeEntries(usedKnowledgeRefs);

  if (!isAIConfigured()) {
    return mockResponse(input, knowledgeEntries, usedKnowledgeRefs, true);
  }

  try {
    const { system, user } = buildResearchPrompt(input, knowledgeEntries);
    const runtime = await completeViaAIRuntime({
      task: "research",
      system,
      user,
      context: {
        sources: ["research", "knowledge", "memory"],
        knowledgeRefs: usedKnowledgeRefs,
      },
    });
    const parsed = JSON.parse(extractJSON(runtime.output));

    if (!validateResearchReportShape(parsed)) {
      throw new Error("Invalid research structure from AI provider");
    }

    const legacyProvider = toLegacyVendor(runtime.provider);

    return {
      data: parsed as ResearchReport,
      source: "ai",
      provider: legacyProvider,
      usedKnowledgeRefs,
      fallbackUsed: runtime.fallbackUsed || runtime.provider === "mock",
    };
  } catch {
    return mockResponse(input, knowledgeEntries, usedKnowledgeRefs, true);
  }
}
