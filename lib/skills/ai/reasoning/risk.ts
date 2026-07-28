/** ForgeOS AI reasoning capability — risk (RC4.7). */

import { REASONING_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(REASONING_CONFIG, action);
}
