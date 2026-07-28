/** Supabase cloud skill — runtime adapter (RC4.2). */

import type { SkillContext } from "@/lib/skills/types";
import { supabaseSkill } from "./module";

export function routeSupabaseSkill(params: {
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  return supabaseSkill.adapter.route({
    skillId: "supabase",
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
    context: params.context,
  });
}
