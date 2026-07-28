/** Analytics KPIs — risk classification (RC4.6). */

import { assessActionRisk } from "../shared/provider-kit";
import { KPIS_DEF } from "./types";

export function assessKPISRisk(action: string) {
  return assessActionRisk(KPIS_DEF, action);
}
