/** GitHub developer skill — risk classification (RC4.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import { githubSkill } from "./module";

export function assessGithubActionRisk(action: string): RiskLevel {
  return githubSkill.assessActionRisk(action);
}
