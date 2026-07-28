/** ForgeOS Analytics Skills — executor bridge (RC4.6). */

import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import { getAnalyticsModuleById } from "./registry";

export function executeAnalyticsSkillMock(
  skillId: string,
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult | null {
  const mod = getAnalyticsModuleById(skillId);
  if (!mod || !("executeMock" in mod)) return null;
  const executor = mod as typeof mod & {
    executeMock: (ctx: SkillContext, route: SkillRoutingDecision) => SkillMockResult;
  };
  return executor.executeMock(context, routing);
}
