/** ForgeOS Marketing Social — registry (RC4.5). */

import { getMarketingProviderConfig } from "../providers-config";
import { createProviderModule } from "../shared/create-provider-module";

export const SOCIAL_CONFIG = getMarketingProviderConfig("social");
export const SOCIAL_MODULE = createProviderModule(SOCIAL_CONFIG);
export const SOCIAL_SKILL = SOCIAL_MODULE.skill;
export const SOCIAL_ACTIONS = SOCIAL_MODULE.actions;
