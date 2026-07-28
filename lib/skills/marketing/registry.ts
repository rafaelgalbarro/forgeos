/** ForgeOS Marketing Skills — aggregated registry (RC4.5). */

import type { SkillDefinition } from "@/lib/skills/types";
import { CAMPAIGNS_SKILL } from "./campaigns/registry";
import { SEO_SKILL } from "./seo/registry";
import { ANALYTICS_SKILL } from "./analytics/registry";
import { ADS_SKILL } from "./ads/registry";
import { SOCIAL_SKILL } from "./social/registry";
import { CONTENT_SKILL } from "./content/registry";
import { EMAIL_SKILL } from "./email/registry";
import { AUTOMATION_SKILL } from "./automation/registry";
import type { MarketingDomain } from "./types";

export const MARKETING_SKILL_REGISTRY: SkillDefinition[] = [
  CAMPAIGNS_SKILL,
  SEO_SKILL,
  ANALYTICS_SKILL,
  ADS_SKILL,
  SOCIAL_SKILL,
  CONTENT_SKILL,
  EMAIL_SKILL,
  AUTOMATION_SKILL,
];

export const MARKETING_SKILL_IDS = new Set(MARKETING_SKILL_REGISTRY.map((s) => s.id));

export const MARKETING_DOMAINS: MarketingDomain[] = [
  "campaigns",
  "seo",
  "analytics",
  "ads",
  "social",
  "content",
  "email",
  "automation",
];

export function isMarketingSkill(skillId: string): boolean {
  return MARKETING_SKILL_IDS.has(skillId);
}

export function getMarketingSkillById(id: string): SkillDefinition | undefined {
  return MARKETING_SKILL_REGISTRY.find((s) => s.id === id);
}

export function listMarketingSkills(): SkillDefinition[] {
  return [...MARKETING_SKILL_REGISTRY];
}

export function getMarketingSkillByDomain(domain: MarketingDomain): SkillDefinition | undefined {
  return MARKETING_SKILL_REGISTRY.find((s) => s.provider === domain);
}
