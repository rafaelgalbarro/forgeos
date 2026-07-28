/** ForgeOS Marketing Ads — registry (RC4.5). */

import { getMarketingProviderConfig } from "../providers-config";
import { createProviderModule } from "../shared/create-provider-module";

export const ADS_CONFIG = getMarketingProviderConfig("ads");
export const ADS_MODULE = createProviderModule(ADS_CONFIG);
export const ADS_SKILL = ADS_MODULE.skill;
export const ADS_ACTIONS = ADS_MODULE.actions;
