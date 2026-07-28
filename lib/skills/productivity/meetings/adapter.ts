/** ForgeOS Productivity Meetings — adapter via Runtime (RC4.3). */

import { createProductivityAdapter } from "../create-provider";
import { MEETINGS_CONFIG } from "../provider-configs";
import { executeMeetingsMock } from "./mock-executor";
import type { SkillContext, SkillRoutingDecision } from "@/lib/skills/types";
import type { ProductivityAdapterResult } from "../types";

const executeViaAdapter = createProductivityAdapter(MEETINGS_CONFIG, executeMeetingsMock);

export function executeMeetingsViaAdapter(
  context: SkillContext,
  routing: SkillRoutingDecision,
  executionId: string
): ProductivityAdapterResult {
  return executeViaAdapter(context, routing, executionId);
}
