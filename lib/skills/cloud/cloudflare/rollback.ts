/** Cloudflare cloud skill — rollback plans (RC4.2). */

import type { RollbackPlan } from "@/lib/skills-governance/types";
import { cloudflareSkill } from "./module";

export function buildCloudflareRollbackPlan(action: string): RollbackPlan {
  return cloudflareSkill.buildRollbackPlan(action);
}
