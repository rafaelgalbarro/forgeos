/** ForgeOS Productivity Skills — execution router (RC4.3). */

import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import { getProductivityModule, isProductivitySkill } from "./registry";

export { isProductivitySkill };

export function executeProductivitySkillMock(
  skillId: string,
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult | null {
  if (!isProductivitySkill(skillId)) return null;
  const mod = getProductivityModule(skillId);
  if (!mod) {
    return { success: false, output: `Productivity skill ${skillId} not found`, mock: true };
  }
  return mod.executeMock(context, routing);
}
