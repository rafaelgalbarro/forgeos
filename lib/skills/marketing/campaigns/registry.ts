/** ForgeOS Marketing Campaigns — registry (RC4.5). */

import { getMarketingProviderConfig } from "../providers-config";
import { createProviderModule } from "../shared/create-provider-module";

export const CAMPAIGNS_CONFIG = getMarketingProviderConfig("campaigns");
export const CAMPAIGNS_MODULE = createProviderModule(CAMPAIGNS_CONFIG);
export const CAMPAIGNS_SKILL = CAMPAIGNS_MODULE.skill;
export const CAMPAIGNS_ACTIONS = CAMPAIGNS_MODULE.actions;
