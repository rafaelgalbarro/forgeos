import type { KnowledgeEntryBase } from "../types";

export type TargetSegment = "B2B" | "B2C" | "B2B2C";

export interface BusinessModelEntry extends KnowledgeEntryBase {
  domain: "business-models";
  revenueStreams: string[];
  pricingModel: string;
  targetSegment: TargetSegment;
  examples: string[];
}
