/** ForgeOS Marketing Analytics — registry (RC4.5). */

import { getMarketingProviderConfig } from "../providers-config";
import { createProviderModule } from "../shared/create-provider-module";

export const ANALYTICS_CONFIG = getMarketingProviderConfig("analytics");
export const ANALYTICS_MODULE = createProviderModule(ANALYTICS_CONFIG);
export const ANALYTICS_SKILL = ANALYTICS_MODULE.skill;
export const ANALYTICS_ACTIONS = ANALYTICS_MODULE.actions;
