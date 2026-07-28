/** ForgeOS Marketing Social — risk (RC4.5). */

import { assessActionRisk } from "../shared/create-provider-module";
import { SOCIAL_CONFIG } from "./registry";

export function assessSocialRisk(action: string) {
  return assessActionRisk(SOCIAL_CONFIG, action);
}
