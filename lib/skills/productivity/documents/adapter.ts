/** ForgeOS Productivity Documents — adapter via Runtime (RC4.3). */

import { createProductivityAdapter } from "../create-provider";
import { DOCUMENTS_CONFIG } from "../provider-configs";
import { executeDocumentsMock } from "./mock-executor";
import type { SkillContext, SkillRoutingDecision } from "@/lib/skills/types";
import type { ProductivityAdapterResult } from "../types";

const executeViaAdapter = createProductivityAdapter(DOCUMENTS_CONFIG, executeDocumentsMock);

export function executeDocumentsViaAdapter(
  context: SkillContext,
  routing: SkillRoutingDecision,
  executionId: string
): ProductivityAdapterResult {
  return executeViaAdapter(context, routing, executionId);
}
