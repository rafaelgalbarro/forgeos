/** ForgeOS Marketing Skills — mock executor dispatcher (RC4.5). */

import type { SkillContext, SkillMockResult, SkillRoutingDecision } from "@/lib/skills/types";
import { executeCampaignsMock } from "./campaigns/mock-executor";
import { executeSeoMock } from "./seo/mock-executor";
import { executeAnalyticsMock } from "./analytics/mock-executor";
import { executeAdsMock } from "./ads/mock-executor";
import { executeSocialMock } from "./social/mock-executor";
import { executeContentMock } from "./content/mock-executor";
import { executeEmailMock } from "./email/mock-executor";
import { executeAutomationMock } from "./automation/mock-executor";
import { getMarketingSkillById } from "./registry";

const EXECUTORS: Record<string, (ctx: { ventureId: string; action: string; payload?: Record<string, unknown>; requestedBy: string }) => SkillMockResult> = {
  "marketing-campaigns": executeCampaignsMock,
  "marketing-seo": executeSeoMock,
  "marketing-analytics": executeAnalyticsMock,
  "marketing-ads": executeAdsMock,
  "marketing-social": executeSocialMock,
  "marketing-content": executeContentMock,
  "marketing-email": executeEmailMock,
  "marketing-automation": executeAutomationMock,
};

export function executeMarketingSkillMock(
  skillId: string,
  context: SkillContext,
  _routing: SkillRoutingDecision
): SkillMockResult {
  const skill = getMarketingSkillById(skillId);
  if (!skill) {
    return { success: false, output: `Marketing skill ${skillId} not found`, mock: true };
  }

  const executor = EXECUTORS[skillId];
  if (!executor) {
    return { success: false, output: `No mock executor for ${skillId}`, mock: true };
  }

  return executor({
    ventureId: context.ventureId,
    action: context.action,
    payload: context.payload,
    requestedBy: context.requestedBy,
  });
}
