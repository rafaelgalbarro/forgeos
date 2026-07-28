import type { KnowledgeEntryBase } from "../types";

export type ScalabilityTier = "low" | "medium" | "high";

export interface ArchitectureEntry extends KnowledgeEntryBase {
  domain: "architecture";
  stack: string[];
  scalability: ScalabilityTier;
  useCases: string[];
  tradeoffs: string[];
}
