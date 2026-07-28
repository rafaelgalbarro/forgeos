/** Analytics Reports — risk classification (RC4.6). */

import { assessActionRisk } from "../shared/provider-kit";
import { REPORTS_DEF } from "./types";

export function assessREPORTSRisk(action: string) {
  return assessActionRisk(REPORTS_DEF, action);
}
