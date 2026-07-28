/** Vercel cloud skill — runtime adapter (RC4.2). */

import type { SkillContext } from "@/lib/skills/types";
import { vercelSkill } from "./module";

export function routeVercelSkill(params: {
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  return vercelSkill.adapter.route({
    skillId: "vercel",
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
    context: params.context,
  });
}
