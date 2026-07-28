/** ForgeOS Productivity Files — adapter via Runtime (RC4.3). */

import { createProductivityAdapter } from "../create-provider";
import { FILES_CONFIG } from "../provider-configs";
import { executeFilesMock } from "./mock-executor";
import type { SkillContext, SkillRoutingDecision } from "@/lib/skills/types";
import type { ProductivityAdapterResult } from "../types";

const executeViaAdapter = createProductivityAdapter(FILES_CONFIG, executeFilesMock);

export function executeFilesViaAdapter(
  context: SkillContext,
  routing: SkillRoutingDecision,
  executionId: string
): ProductivityAdapterResult {
  return executeViaAdapter(context, routing, executionId);
}
