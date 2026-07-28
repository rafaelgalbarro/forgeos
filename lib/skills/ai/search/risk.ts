/** ForgeOS AI search capability — risk (RC4.7). */

import { SEARCH_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(SEARCH_CONFIG, action);
}
