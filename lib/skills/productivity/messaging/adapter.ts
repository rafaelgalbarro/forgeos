/** ForgeOS Productivity Messaging — adapter via Runtime (RC4.3). */

import { createProductivityAdapter } from "../create-provider";
import { MESSAGING_CONFIG } from "../provider-configs";
import { executeMessagingMock } from "./mock-executor";
import type { SkillContext, SkillRoutingDecision } from "@/lib/skills/types";
import type { ProductivityAdapterResult } from "../types";

const executeViaAdapter = createProductivityAdapter(MESSAGING_CONFIG, executeMessagingMock);

export function executeMessagingViaAdapter(
  context: SkillContext,
  routing: SkillRoutingDecision,
  executionId: string
): ProductivityAdapterResult {
  return executeViaAdapter(context, routing, executionId);
}
