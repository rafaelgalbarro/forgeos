/** Docker developer skill — mock executor (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { dockerSkill } from "./module";

export function executeDockerMock(action: string, context: SkillContext): SkillMockResult {
  return dockerSkill.executeMock(action, context);
}
