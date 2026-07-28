import type { AppCategory } from "@/lib/types/app";
import type { KnowledgeRefSummary, ResearchReportResponse } from "@/lib/ai/types/research";
import type { DiscoveryContext } from "@/lib/discovery/types";

export interface ResearchFetchInput {
  projectName: string;
  ideaText: string;
  category?: AppCategory;
  targetAudience?: string;
  knowledgeRefs?: KnowledgeRefSummary[];
  discoveryContext?: DiscoveryContext | null;
}

const CATEGORY_LABELS: Record<string, string> = {
  saas: "SaaS",
  marketplace: "Marketplace",
  dashboard: "Dashboard",
  reservas: "Reservas",
  mobile: "Mobile App",
  ecommerce: "E-commerce",
};

export async function fetchResearchReport(input: ResearchFetchInput): Promise<ResearchReportResponse> {
  const res = await fetch("/api/generate/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectName: input.projectName,
      ideaText: input.ideaText,
      appType: input.category ? (CATEGORY_LABELS[input.category] ?? input.category) : undefined,
      targetCustomer: input.targetAudience,
      knowledgeRefs: input.knowledgeRefs ?? [],
      discoveryContext: input.discoveryContext ?? null,
    }),
  });

  if (!res.ok) {
    throw new Error(`Research API failed: ${res.status}`);
  }

  return res.json() as Promise<ResearchReportResponse>;
}
