/** Supabase cloud skill — risk classification (RC4.2). */

import type { RiskLevel } from "@/lib/skills-governance/types";
import { supabaseSkill } from "./module";

export function assessSupabaseActionRisk(action: string): RiskLevel {
  return supabaseSkill.assessActionRisk(action);
}
