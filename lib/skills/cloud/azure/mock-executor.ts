/** Azure cloud skill — mock executor (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { azureSkill } from "./module";

export function executeAzureMock(action: string, context: SkillContext): SkillMockResult {
  return azureSkill.executeMock(action, context);
}
