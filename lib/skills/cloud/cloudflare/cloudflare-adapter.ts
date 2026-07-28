/** Cloudflare cloud skill — runtime adapter (RC4.2). */

import type { SkillContext } from "@/lib/skills/types";
import { cloudflareSkill } from "./module";

export function routeCloudflareSkill(params: {
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  return cloudflareSkill.adapter.route({
    skillId: "cloudflare",
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
    context: params.context,
  });
}
