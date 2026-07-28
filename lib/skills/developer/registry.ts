/** ForgeOS Developer Skills — aggregated registry (RC4.2). */

import type { SkillDefinition } from "@/lib/skills/types";
import type { ProviderSkillModule } from "@/lib/skills/shared/provider-factory";
import { githubSkill } from "./github";
import { gitlabSkill } from "./gitlab";
import { dockerSkill } from "./docker";

export const DEVELOPER_PROVIDER_MODULES: ProviderSkillModule[] = [
  githubSkill.module,
  gitlabSkill.module,
  dockerSkill.module,
];

export const DEVELOPER_SKILL_REGISTRY: SkillDefinition[] = DEVELOPER_PROVIDER_MODULES.map(
  (m) => m.registry
);

export const DEVELOPER_PROVIDER_IDS = ["github", "gitlab", "docker"] as const;

export function getDeveloperProviderModule(skillId: string): ProviderSkillModule | undefined {
  return DEVELOPER_PROVIDER_MODULES.find((m) => m.config.id === skillId);
}

export function isDeveloperProviderSkill(skillId: string): boolean {
  return DEVELOPER_PROVIDER_IDS.includes(skillId as (typeof DEVELOPER_PROVIDER_IDS)[number]);
}
