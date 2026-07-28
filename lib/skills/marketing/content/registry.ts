/** ForgeOS Marketing Content — registry (RC4.5). */

import { getMarketingProviderConfig } from "../providers-config";
import { createProviderModule } from "../shared/create-provider-module";

export const CONTENT_CONFIG = getMarketingProviderConfig("content");
export const CONTENT_MODULE = createProviderModule(CONTENT_CONFIG);
export const CONTENT_SKILL = CONTENT_MODULE.skill;
export const CONTENT_ACTIONS = CONTENT_MODULE.actions;
