import type { KnowledgeRefSummary } from "./research";
import type { ResearchReport } from "./research";

export interface ProductPRDRequest {
  projectName: string;
  description: string;
  appType: string;
  targetCustomer: string;
  researchReport?: ResearchReport | null;
  knowledgeRefs?: KnowledgeRefSummary[];
  discoveryContext?: import("@/lib/discovery/types").DiscoveryContext | null;
}

export interface ProductPRDRoadmap {
  day30: string[];
  day60: string[];
  day90: string[];
}

export interface ProductPRD {
  executiveSummary: string;
  problemStatement: string;
  targetCustomer: string;
  valueProposition: string;
  mvpScope: string[];
  v2Features: string[];
  userStories: string[];
  mainScreens: string[];
  coreFlows: string[];
  assumptions: string[];
  risks: string[];
  successMetrics: string[];
  roadmap30_60_90: ProductPRDRoadmap;
}

export interface ProductPRDResponse {
  data: ProductPRD;
  source: "ai" | "mock";
  provider?: string;
  usedResearch: boolean;
  usedKnowledgeRefs: KnowledgeRefSummary[];
  fallbackUsed: boolean;
}
