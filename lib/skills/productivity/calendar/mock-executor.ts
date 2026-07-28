/** ForgeOS Productivity Calendar — mock executor (RC4.3). */

import { createProductivityMockExecutor } from "../create-provider";
import { CALENDAR_CONFIG } from "../provider-configs";
import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";

const execute = createProductivityMockExecutor(CALENDAR_CONFIG);

export function executeCalendarMock(
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult {
  return execute(context, routing);
}
