/** Analytics Metrics — risk classification (RC4.6). */

import { assessActionRisk } from "../shared/provider-kit";
import { METRICS_DEF } from "./types";

export function assessMETRICSRisk(action: string) {
  return assessActionRisk(METRICS_DEF, action);
}
