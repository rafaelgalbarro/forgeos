/** ForgeOS Productivity Messaging — mock executor (RC4.3). */

import { createProductivityMockExecutor } from "../create-provider";
import { MESSAGING_CONFIG } from "../provider-configs";
import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";

const execute = createProductivityMockExecutor(MESSAGING_CONFIG);

export function executeMessagingMock(
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult {
  return execute(context, routing);
}
