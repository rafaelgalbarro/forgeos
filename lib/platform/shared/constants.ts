/** ForgeOS Platform — pillar metadata constants. */

import type { PillarId } from "./types";

export const PLATFORM_VERSION = "1.0.0" as const;
export const PLATFORM_NAME = "ForgeOS Venture Operating System" as const;

export const PILLAR_NAMES: Record<PillarId, string> = {
  strategy: "Strategy",
  product: "Product",
  build: "Build",
  launch: "Launch",
  growth: "Growth",
  ceo: "CEO",
  studio: "Studio",
  intelligence: "Intelligence",
  capital: "Capital",
};

export const PILLAR_VERSIONS: Record<PillarId, string> = {
  strategy: "0.1.0",
  product: "0.1.0",
  build: "0.1.0",
  launch: "0.1.0",
  growth: "0.1.0",
  ceo: "0.1.0",
  studio: "0.1.0",
  intelligence: "0.1.0",
  capital: "0.1.0",
};

export const PILLAR_DESCRIPTIONS: Record<PillarId, string> = {
  strategy: "Discovery, research, simulation and strategic validation.",
  product: "PRD, roadmap, UX and product definition.",
  build: "Build plans, technical execution and dev-tool connectors.",
  launch: "Branding, landing, SEO, marketing and go-to-market.",
  growth: "CAC, LTV, funnels, experiments and retention.",
  ceo: "Executive orchestration, priorities and venture review.",
  studio: "Portfolio, knowledge and venture studio operations.",
  intelligence: "Memory, patterns, decisions and learning layer.",
  capital: "Investor pack, data room, cap table and fundraising.",
};
