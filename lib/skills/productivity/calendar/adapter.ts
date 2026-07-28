/** ForgeOS Productivity Calendar — adapter via Runtime (RC4.3). */

import { createProductivityAdapter } from "../create-provider";
import { CALENDAR_CONFIG } from "../provider-configs";
import { executeCalendarMock } from "./mock-executor";
import type { SkillContext, SkillRoutingDecision } from "@/lib/skills/types";
import type { ProductivityAdapterResult } from "../types";

const executeViaAdapter = createProductivityAdapter(CALENDAR_CONFIG, executeCalendarMock);

export function executeCalendarViaAdapter(
  context: SkillContext,
  routing: SkillRoutingDecision,
  executionId: string
): ProductivityAdapterResult {
  return executeViaAdapter(context, routing, executionId);
}
