/** Vercel cloud skill — risk classification (RC4.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import { vercelSkill } from "./module";

export function assessVercelActionRisk(action: string): RiskLevel {
  return vercelSkill.assessActionRisk(action);
}
