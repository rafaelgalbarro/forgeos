/** GCP cloud skill — runtime adapter (RC4.2). */

import type { SkillContext } from "@/lib/skills/types";
import { gcpSkill } from "./module";

export function routeGcpSkill(params: {
  ventureId: string;
  executionId: string;
  action: string;
  context: SkillContext;
}) {
  return gcpSkill.adapter.route({
    skillId: "gcp",
    ventureId: params.ventureId,
    executionId: params.executionId,
    action: params.action,
    context: params.context,
  });
}
