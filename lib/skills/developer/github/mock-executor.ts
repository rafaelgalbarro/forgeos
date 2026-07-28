/** GitHub developer skill — mock executor (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { githubSkill } from "./module";

export function executeGithubMock(action: string, context: SkillContext): SkillMockResult {
  return githubSkill.executeMock(action, context);
}
