/** ForgeOS AI audio capability — risk (RC4.7). */

import { AUDIO_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(AUDIO_CONFIG, action);
}
