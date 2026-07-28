/** GitHub developer skill — rollback plans (RC4.2). */

import type { RollbackPlan } from "@/lib/skills-governance/types";
import { githubSkill } from "./module";

export function buildGithubRollbackPlan(action: string): RollbackPlan {
  return githubSkill.buildRollbackPlan(action);
}
