/** ForgeOS Cloud Skills — aggregated registry (RC4.2). */

import type { SkillDefinition } from "@/lib/skills/types";
import type { ProviderSkillModule } from "@/lib/skills/shared/provider-factory";
import { vercelSkill } from "./vercel";
import { cloudflareSkill } from "./cloudflare";
import { supabaseSkill } from "./supabase";
import { awsSkill } from "./aws";
import { azureSkill } from "./azure";
import { gcpSkill } from "./gcp";

export const CLOUD_PROVIDER_MODULES: ProviderSkillModule[] = [
  vercelSkill.module,
  cloudflareSkill.module,
  supabaseSkill.module,
  awsSkill.module,
  azureSkill.module,
  gcpSkill.module,
];

export const CLOUD_SKILL_REGISTRY: SkillDefinition[] = CLOUD_PROVIDER_MODULES.map((m) => m.registry);

export const CLOUD_PROVIDER_IDS = [
  "vercel",
  "cloudflare",
  "supabase",
  "aws",
  "azure",
  "gcp",
] as const;

export function getCloudProviderModule(skillId: string): ProviderSkillModule | undefined {
  return CLOUD_PROVIDER_MODULES.find((m) => m.config.id === skillId);
}

export function isCloudProviderSkill(skillId: string): boolean {
  return CLOUD_PROVIDER_IDS.includes(skillId as (typeof CLOUD_PROVIDER_IDS)[number]);
}
