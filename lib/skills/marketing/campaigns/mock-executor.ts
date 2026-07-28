/** ForgeOS Marketing Campaigns — mock executor (RC4.5). */

import { executeMock } from "../shared/create-provider-module";
import { CAMPAIGNS_CONFIG } from "./registry";
import type { MarketingMockContext } from "../types";

export function executeCampaignsMock(context: MarketingMockContext) {
  return executeMock(CAMPAIGNS_CONFIG, context);
}
