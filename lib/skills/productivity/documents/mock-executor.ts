/** ForgeOS Productivity Documents — mock executor (RC4.3). */

import { createProductivityMockExecutor } from "../create-provider";
import { DOCUMENTS_CONFIG } from "../provider-configs";
import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";

const execute = createProductivityMockExecutor(DOCUMENTS_CONFIG);

export function executeDocumentsMock(
  context: SkillContext,
  routing: SkillRoutingDecision
): SkillMockResult {
  return execute(context, routing);
}
