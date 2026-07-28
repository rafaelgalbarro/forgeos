/** ForgeOS AI memory capability — risk (RC4.7). */

import { MEMORY_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(MEMORY_CONFIG, action);
}
