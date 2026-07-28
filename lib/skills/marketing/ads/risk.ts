/** ForgeOS Marketing Ads — risk (RC4.5). */

import { assessActionRisk } from "../shared/create-provider-module";
import { ADS_CONFIG } from "./registry";

export function assessAdsRisk(action: string) {
  return assessActionRisk(ADS_CONFIG, action);
}
