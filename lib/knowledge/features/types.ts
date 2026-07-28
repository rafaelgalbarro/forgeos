import type { KnowledgeEntryBase } from "../types";

export type FeaturePriority = "must" | "should" | "could";

export interface FeatureEntry extends KnowledgeEntryBase {
  domain: "features";
  priority: FeaturePriority;
  userStories: string[];
  acceptanceCriteria: string[];
}
