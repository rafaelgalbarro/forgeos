/** ForgeOS Marketing Analytics — risk (RC4.5). */

import { assessActionRisk } from "../shared/create-provider-module";
import { ANALYTICS_CONFIG } from "./registry";

export function assessAnalyticsRisk(action: string) {
  return assessActionRisk(ANALYTICS_CONFIG, action);
}
