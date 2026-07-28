/** ForgeOS AI video capability — risk (RC4.7). */

import { VIDEO_CONFIG } from "../shared/capabilities";
import { assessActionRisk } from "../shared/capability-factory";

export function assessRisk(action: string) {
  return assessActionRisk(VIDEO_CONFIG, action);
}
