/** GitLab developer skill — mock executor (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { gitlabSkill } from "./module";

export function executeGitlabMock(action: string, context: SkillContext): SkillMockResult {
  return gitlabSkill.executeMock(action, context);
}
