/** GCP cloud skill — rollback plans (RC4.2). */

import type { RollbackPlan } from "@/lib/skills-governance/types";
import { gcpSkill } from "./module";

export function buildGcpRollbackPlan(action: string): RollbackPlan {
  return gcpSkill.buildRollbackPlan(action);
}
