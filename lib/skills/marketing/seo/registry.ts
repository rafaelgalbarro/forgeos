/** ForgeOS Marketing Seo — registry (RC4.5). */

import { getMarketingProviderConfig } from "../providers-config";
import { createProviderModule } from "../shared/create-provider-module";

export const SEO_CONFIG = getMarketingProviderConfig("seo");
export const SEO_MODULE = createProviderModule(SEO_CONFIG);
export const SEO_SKILL = SEO_MODULE.skill;
export const SEO_ACTIONS = SEO_MODULE.actions;
