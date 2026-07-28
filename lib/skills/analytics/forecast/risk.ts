/** Analytics Forecast — risk classification (RC4.6). */

import { assessActionRisk } from "../shared/provider-kit";
import { FORECAST_DEF } from "./types";

export function assessFORECASTRisk(action: string) {
  return assessActionRisk(FORECAST_DEF, action);
}
