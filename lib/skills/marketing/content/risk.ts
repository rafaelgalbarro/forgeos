/** ForgeOS Marketing Content — risk (RC4.5). */

import { assessActionRisk } from "../shared/create-provider-module";
import { CONTENT_CONFIG } from "./registry";

export function assessContentRisk(action: string) {
  return assessActionRisk(CONTENT_CONFIG, action);
}
