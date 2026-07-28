import type { FounderAdvisorOutput } from "@/lib/intelligence/types";

export type FounderRisk = { title: string; description: string };
export type FounderOpportunity = { title: string; description: string; probability: "alta" | "media" };
export type FounderAlternative = { title: string; description: string; rationale: string };

export interface FounderAdvisorReport {
  headline: string;
  summary: string;
  risks: FounderRisk[];
  opportunities: FounderOpportunity[];
  alternatives: FounderAlternative[];
  recommendation: string;
  shouldCompare: boolean;
}

/** Map intelligence output to legacy shape for existing components. */
export function mapFounderAdvisorReport(advisor: FounderAdvisorOutput): FounderAdvisorReport {
  return {
    headline: advisor.headline,
    summary: advisor.summary,
    risks: advisor.risks.map(({ title, description }) => ({ title, description })),
    opportunities: advisor.opportunities,
    alternatives: advisor.alternatives,
    recommendation: advisor.recommendations.map((r) => r.text).join(" "),
    shouldCompare: advisor.shouldCompare,
  };
}
