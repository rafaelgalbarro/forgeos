/** Docker developer skill — risk classification (RC4.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import { dockerSkill } from "./module";

export function assessDockerActionRisk(action: string): RiskLevel {
  return dockerSkill.assessActionRisk(action);
}
