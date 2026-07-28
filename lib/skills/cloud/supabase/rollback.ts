/** Supabase cloud skill — rollback plans (RC4.2). */

import type { RollbackPlan } from "@/lib/skills-governance/types";
import { supabaseSkill } from "./module";

export function buildSupabaseRollbackPlan(action: string): RollbackPlan {
  return supabaseSkill.buildRollbackPlan(action);
}
