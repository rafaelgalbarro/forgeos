/** Azure cloud skill — rollback plans (RC4.2). */

import type { RollbackPlan } from "@/lib/skills-governance/types";
import { azureSkill } from "./module";

export function buildAzureRollbackPlan(action: string): RollbackPlan {
  return azureSkill.buildRollbackPlan(action);
}
