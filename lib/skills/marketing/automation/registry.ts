/** ForgeOS Marketing Automation — registry (RC4.5). */

import { getMarketingProviderConfig } from "../providers-config";
import { createProviderModule } from "../shared/create-provider-module";

export const AUTOMATION_CONFIG = getMarketingProviderConfig("automation");
export const AUTOMATION_MODULE = createProviderModule(AUTOMATION_CONFIG);
export const AUTOMATION_SKILL = AUTOMATION_MODULE.skill;
export const AUTOMATION_ACTIONS = AUTOMATION_MODULE.actions;
