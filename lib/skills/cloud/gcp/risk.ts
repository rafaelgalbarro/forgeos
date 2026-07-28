/** GCP cloud skill — risk classification (RC4.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import { gcpSkill } from "./module";

export function assessGcpActionRisk(action: string): RiskLevel {
  return gcpSkill.assessActionRisk(action);
}
