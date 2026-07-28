/** ForgeOS Marketing Campaigns — risk (RC4.5). */

import { assessActionRisk } from "../shared/create-provider-module";
import { CAMPAIGNS_CONFIG } from "./registry";

export function assessCampaignsRisk(action: string) {
  return assessActionRisk(CAMPAIGNS_CONFIG, action);
}
