/** AWS cloud skill — risk classification (RC4.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import { awsSkill } from "./module";

export function assessAwsActionRisk(action: string): RiskLevel {
  return awsSkill.assessActionRisk(action);
}
