import type { AppCategory } from "@/lib/types/app";
import type { KnowledgeRefSummary } from "@/lib/ai/types/research";
import type { ResearchReport } from "@/lib/ai/types/research";
import type { ProductPRDResponse } from "@/lib/ai/types/product";
import type { DiscoveryContext } from "@/lib/discovery/types";

export interface ProductPRDFetchInput {
  name: string;
  description: string;
  category: AppCategory;
  targetAudience: string;
  researchReport?: ResearchReport | null;
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

export async function fetchProductPRD(input: ProductPRDFetchInput): Promise<ProductPRDResponse> {
  const res = await fetch("/api/generate/product", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      projectName: input.name,
      description: input.description,
      appType: CATEGORY_LABELS[input.category] ?? input.category,
      targetCustomer: input.targetAudience,
      researchReport: input.researchReport ?? null,
      knowledgeRefs: input.knowledgeRefs ?? [],
      discoveryContext: input.discoveryContext ?? null,
    }),
  });

  if (!res.ok) {
    throw new Error(`Product PRD API failed: ${res.status}`);
  }

  return res.json() as Promise<ProductPRDResponse>;
}
