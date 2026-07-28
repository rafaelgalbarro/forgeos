/** ForgeOS AI vision capability — risk (RC4.7). */

import { VISION_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(VISION_CONFIG, action);
}
