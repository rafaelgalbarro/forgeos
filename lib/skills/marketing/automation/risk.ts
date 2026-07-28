/** ForgeOS Marketing Automation — risk (RC4.5). */

import { assessActionRisk } from "../shared/create-provider-module";
import { AUTOMATION_CONFIG } from "./registry";

export function assessAutomationRisk(action: string) {
  return assessActionRisk(AUTOMATION_CONFIG, action);
}
