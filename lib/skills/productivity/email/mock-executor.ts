/** ForgeOS Productivity Email — mock executor (RC4.3). */

import { createProductivityMockExecutor } from "../create-provider";
import { EMAIL_CONFIG } from "../provider-configs";
import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";

const execute = createProductivityMockExecutor(EMAIL_CONFIG);

export function executeEmailMock(
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult {
  return execute(context, routing);
}
