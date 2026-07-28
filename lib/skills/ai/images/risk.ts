/** ForgeOS AI images capability — risk (RC4.7). */

import { IMAGES_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(IMAGES_CONFIG, action);
}
