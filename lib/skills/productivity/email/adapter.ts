/** ForgeOS Productivity Email — adapter via Runtime (RC4.3). */

import { createProductivityAdapter } from "../create-provider";
import { EMAIL_CONFIG } from "../provider-configs";
import { executeEmailMock } from "./mock-executor";
import type { SkillContext, SkillRoutingDecision } from "@/lib/skills/types";
import type { ProductivityAdapterResult } from "../types";

const executeViaAdapter = createProductivityAdapter(EMAIL_CONFIG, executeEmailMock);

export function executeEmailViaAdapter(
  context: SkillContext,
  routing: SkillRoutingDecision,
  executionId: string
): ProductivityAdapterResult {
  return executeViaAdapter(context, routing, executionId);
}
