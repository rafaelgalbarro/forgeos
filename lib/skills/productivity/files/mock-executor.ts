/** ForgeOS Productivity Files — mock executor (RC4.3). */

import { createProductivityMockExecutor } from "../create-provider";
import { FILES_CONFIG } from "../provider-configs";
import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";

const execute = createProductivityMockExecutor(FILES_CONFIG);

export function executeFilesMock(
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult {
  return execute(context, routing);
}
