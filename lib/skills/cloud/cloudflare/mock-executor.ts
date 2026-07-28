/** Cloudflare cloud skill — mock executor (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { cloudflareSkill } from "./module";

export function executeCloudflareMock(action: string, context: SkillContext): SkillMockResult {
  return cloudflareSkill.executeMock(action, context);
}
