/** Analytics Dashboards — risk classification (RC4.6). */

import { assessActionRisk } from "../shared/provider-kit";
import { DASHBOARDS_DEF } from "./types";

export function assessDASHBOARDSRisk(action: string) {
  return assessActionRisk(DASHBOARDS_DEF, action);
}
