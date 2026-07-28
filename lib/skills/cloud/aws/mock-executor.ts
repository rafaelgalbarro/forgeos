/** AWS cloud skill — mock executor (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { awsSkill } from "./module";

export function executeAwsMock(action: string, context: SkillContext): SkillMockResult {
  return awsSkill.executeMock(action, context);
}
