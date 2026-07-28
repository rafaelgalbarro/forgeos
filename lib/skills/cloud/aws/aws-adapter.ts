/** AWS cloud skill — runtime adapter (RC4.2). */

import type { SkillContext } from "@/lib/skills/types";
import { awsSkill } from "./module";

export function routeAwsSkill(params: {
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  return awsSkill.adapter.route({
    skillId: "aws",
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
    context: params.context,
  });
}
