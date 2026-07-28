/** Supabase cloud skill — mock executor (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { supabaseSkill } from "./module";

export function executeSupabaseMock(action: string, context: SkillContext): SkillMockResult {
  return supabaseSkill.executeMock(action, context);
}
