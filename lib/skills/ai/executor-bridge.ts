/** ForgeOS AI Capability Skills — executor bridge (RC4.7). */

import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import { getAICapabilityModuleById, isAICapabilitySkill } from "./registry";

export function executeAICapabilitySkillMock(
  skillId: string,
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult | null {
  const mod = getAICapabilityModuleById(skillId);
  if (!mod) return null;
  return mod.executeMock(context.action, context, routing);
}

export { isAICapabilitySkill };
