/** ForgeOS Productivity Knowledge — adapter via Runtime (RC4.3). */

import { createProductivityAdapter } from "../create-provider";
import { KNOWLEDGE_CONFIG } from "../provider-configs";
import { executeKnowledgeMock } from "./mock-executor";
import type { SkillContext, SkillRoutingDecision } from "@/lib/skills/types";
import type { ProductivityAdapterResult } from "../types";

const executeViaAdapter = createProductivityAdapter(KNOWLEDGE_CONFIG, executeKnowledgeMock);

export function executeKnowledgeViaAdapter(
  context: SkillContext,
  routing: SkillRoutingDecision,
  executionId: string
): ProductivityAdapterResult {
  return executeViaAdapter(context, routing, executionId);
}
