import type { KnowledgeEntryBase } from "../types";

export type PricingStrategy = "freemium" | "subscription" | "usage" | "one-time" | "hybrid";

export interface PricingEntry extends KnowledgeEntryBase {
  domain: "pricing";
  strategy: PricingStrategy;
  tiers: { name: string; priceHint: string; features: string[] }[];
  benchmarks: string[];
}
