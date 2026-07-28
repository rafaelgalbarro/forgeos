/** ForgeOS Marketing Email — risk (RC4.5). */

import { assessActionRisk } from "../shared/create-provider-module";
import { EMAIL_CONFIG } from "./registry";

export function assessEmailRisk(action: string) {
  return assessActionRisk(EMAIL_CONFIG, action);
}
