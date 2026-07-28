/** ForgeOS AI coding capability — risk (RC4.7). */

import { CODING_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(CODING_CONFIG, action);
}
