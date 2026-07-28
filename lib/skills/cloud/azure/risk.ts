/** Azure cloud skill — risk classification (RC4.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import { azureSkill } from "./module";

export function assessAzureActionRisk(action: string): RiskLevel {
  return azureSkill.assessActionRisk(action);
}
