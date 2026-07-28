/** Vercel cloud skill — rollback plans (RC4.2). */

import type { RollbackPlan } from "@/lib/skills-governance/types";
import { vercelSkill } from "./module";

export function buildVercelRollbackPlan(action: string): RollbackPlan {
  return vercelSkill.buildRollbackPlan(action);
}
