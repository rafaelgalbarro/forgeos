import type { KnowledgeEntryBase } from "../types";

export type PatternCategory = "product" | "engineering" | "growth" | "ops";

export interface PatternEntry extends KnowledgeEntryBase {
  domain: "patterns";
  category: PatternCategory;
  whenToUse: string[];
  antiPatterns: string[];
}
