/** GCP cloud skill — mock executor (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { gcpSkill } from "./module";

export function executeGcpMock(action: string, context: SkillContext): SkillMockResult {
  return gcpSkill.executeMock(action, context);
}
