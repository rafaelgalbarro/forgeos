/** AWS cloud skill — rollback plans (RC4.2). */

import type { RollbackPlan } from "@/lib/skills-governance/types";
import { awsSkill } from "./module";

export function buildAwsRollbackPlan(action: string): RollbackPlan {
  return awsSkill.buildRollbackPlan(action);
}
