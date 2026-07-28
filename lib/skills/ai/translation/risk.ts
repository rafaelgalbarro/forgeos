/** ForgeOS AI translation capability — risk (RC4.7). */

import { TRANSLATION_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(TRANSLATION_CONFIG, action);
}
