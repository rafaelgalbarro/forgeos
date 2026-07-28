/** Docker developer skill — runtime adapter (RC4.2). */

import type { SkillContext } from "@/lib/skills/types";
import { dockerSkill } from "./module";

export function routeDockerSkill(params: {
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  return dockerSkill.adapter.route({
    skillId: "docker",
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
    context: params.context,
  });
}
