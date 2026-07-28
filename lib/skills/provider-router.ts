/** ForgeOS Developer Skills — provider lookup & mock routing (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import type { ProviderSkillModule } from "@/lib/skills/shared/provider-factory";
import {
  DEVELOPER_PROVIDER_MODULES,
  getDeveloperProviderModule,
  isDeveloperProviderSkill,
} from "./developer/registry";
import {
  CLOUD_PROVIDER_MODULES,
  getCloudProviderModule,
  isCloudProviderSkill,
} from "./cloud/registry";

export const RC42_PROVIDER_MODULES: ProviderSkillModule[] = [
  ...DEVELOPER_PROVIDER_MODULES,
  ...CLOUD_PROVIDER_MODULES,
];

export const RC42_PROVIDER_IDS = RC42_PROVIDER_MODULES.map((m) => m.config.id);

export function isRc42ProviderSkill(skillId: string): boolean {
  return isDeveloperProviderSkill(skillId) || isCloudProviderSkill(skillId);
}

export function getRc42ProviderModule(skillId: string): ProviderSkillModule | undefined {
  return getDeveloperProviderModule(skillId) ?? getCloudProviderModule(skillId);
}

export function executeProviderSkillMock(
  skillId: string,
  context: SkillContext
): SkillMockResult | null {
  const mod = getRc42ProviderModule(skillId);
  if (!mod) return null;
  return mod.executeMock(context.action, context);
}

export function routeProviderSkillAdapter(params: {
  skillId: string;
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  const mod = getRc42ProviderModule(params.skillId);
  if (!mod) return null;
  return mod.adapter.route(params);
}

export function assessProviderActionRisk(skillId: string, action: string) {
  const mod = getRc42ProviderModule(skillId);
  return mod?.assessActionRisk(action);
}
