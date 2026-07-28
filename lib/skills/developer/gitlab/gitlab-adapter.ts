/** GitLab developer skill — runtime adapter (RC4.2). */

import type { SkillContext } from "@/lib/skills/types";
import { gitlabSkill } from "./module";

export function routeGitlabSkill(params: {
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  return gitlabSkill.adapter.route({
    skillId: "gitlab",
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
    context: params.context,
  });
}
