/** GitLab developer skill — rollback plans (RC4.2). */

import type { RollbackPlan } from "@/lib/skills-governance/types";
import { gitlabSkill } from "./module";

export function buildGitlabRollbackPlan(action: string): RollbackPlan {
  return gitlabSkill.buildRollbackPlan(action);
}
