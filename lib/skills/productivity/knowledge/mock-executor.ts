/** ForgeOS Productivity Knowledge — mock executor (RC4.3). */

import { createProductivityMockExecutor } from "../create-provider";
import { KNOWLEDGE_CONFIG } from "../provider-configs";
import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";

const execute = createProductivityMockExecutor(KNOWLEDGE_CONFIG);

export function executeKnowledgeMock(
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult {
  return execute(context, routing);
}
