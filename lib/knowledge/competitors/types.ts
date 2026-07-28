import type { KnowledgeEntryBase } from "../types";

export interface CompetitorEntry extends KnowledgeEntryBase {
  domain: "competitors";
  category: string;
  strengths: string[];
  weaknesses: string[];
  pricingNotes: string;
}
