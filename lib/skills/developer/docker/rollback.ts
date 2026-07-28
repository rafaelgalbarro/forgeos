/** Docker developer skill — rollback plans (RC4.2). */

import type { RollbackPlan } from "@/lib/skills-governance/types";
import { dockerSkill } from "./module";

export function buildDockerRollbackPlan(action: string): RollbackPlan {
  return dockerSkill.buildRollbackPlan(action);
}
