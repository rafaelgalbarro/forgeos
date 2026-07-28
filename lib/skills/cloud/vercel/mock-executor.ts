/** Vercel cloud skill — mock executor (RC4.2). */

import type { SkillContext, SkillMockResult } from "@/lib/skills/types";
import { vercelSkill } from "./module";

export function executeVercelMock(action: string, context: SkillContext): SkillMockResult {
  return vercelSkill.executeMock(action, context);
}
