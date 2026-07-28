/** GitLab developer skill — risk classification (RC4.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import { gitlabSkill } from "./module";

export function assessGitlabActionRisk(action: string): RiskLevel {
  return gitlabSkill.assessActionRisk(action);
}
