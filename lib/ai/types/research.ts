export interface KnowledgeRefSummary {
  id: string;
  domain: string;
  title: string;
}

export interface ResearchCompetitor {
  name: string;
  type: string;
  strengths: string[];
  weaknesses: string[];
}

export interface ResearchReport {
  marketSummary: string;
  targetSegments: string[];
  competitors: ResearchCompetitor[];
  marketRisks: string[];
  opportunities: string[];
  differentiationAngles: string[];
  validationPlan: string[];
  recommendedNextQuestions: string[];
}

export interface ResearchRequest {
  projectName: string;
  ideaText: string;
  appType?: string;
  targetCustomer?: string;
  knowledgeRefs?: KnowledgeRefSummary[];
  discoveryContext?: import("@/lib/discovery/types").DiscoveryContext | null;
}

export interface ResearchReportResponse {
  data: ResearchReport;
  source: "ai" | "mock";
  provider?: string;
  usedKnowledgeRefs: KnowledgeRefSummary[];
  fallbackUsed: boolean;
}
