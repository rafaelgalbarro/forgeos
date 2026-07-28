/** ForgeOS Productivity Meetings — mock executor (RC4.3). */

import { createProductivityMockExecutor } from "../create-provider";
import { MEETINGS_CONFIG } from "../provider-configs";
import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";

const execute = createProductivityMockExecutor(MEETINGS_CONFIG);

export function executeMeetingsMock(
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult {
  return execute(context, routing);
}
