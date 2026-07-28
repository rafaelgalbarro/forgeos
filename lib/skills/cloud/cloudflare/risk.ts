/** Cloudflare cloud skill — risk classification (RC4.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import { cloudflareSkill } from "./module";

export function assessCloudflareActionRisk(action: string): RiskLevel {
  return cloudflareSkill.assessActionRisk(action);
}
