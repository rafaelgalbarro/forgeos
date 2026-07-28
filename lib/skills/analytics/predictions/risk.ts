/** Analytics Predictions — risk classification (RC4.6). */

import { assessActionRisk } from "../shared/provider-kit";
import { PREDICTIONS_DEF } from "./types";

export function assessPREDICTIONSRisk(action: string) {
  return assessActionRisk(PREDICTIONS_DEF, action);
}
