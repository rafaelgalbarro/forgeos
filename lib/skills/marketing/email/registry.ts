/** ForgeOS Marketing Email — registry (RC4.5). */

import { getMarketingProviderConfig } from "../providers-config";
import { createProviderModule } from "../shared/create-provider-module";

export const EMAIL_CONFIG = getMarketingProviderConfig("email");
export const EMAIL_MODULE = createProviderModule(EMAIL_CONFIG);
export const EMAIL_SKILL = EMAIL_MODULE.skill;
export const EMAIL_ACTIONS = EMAIL_MODULE.actions;
