/** ForgeOS AI voice capability — risk (RC4.7). */

import { VOICE_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(VOICE_CONFIG, action);
}
