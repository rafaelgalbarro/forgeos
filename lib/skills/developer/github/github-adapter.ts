/** GitHub developer skill — runtime adapter (RC4.2). */

import type { SkillContext } from "@/lib/skills/types";
import { githubSkill } from "./module";

export function routeGithubSkill(params: {
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  return githubSkill.adapter.route({
    skillId: "github",
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
    context: params.context,
  });
}
