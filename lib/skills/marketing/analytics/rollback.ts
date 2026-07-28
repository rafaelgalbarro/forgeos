/** ForgeOS Marketing Analytics — rollback (RC4.5). */

import { buildRollbackPlan } from "../shared/create-provider-module";
import { ANALYTICS_CONFIG } from "./registry";

export function buildAnalyticsRollback(action: string) {
  return buildRollbackPlan(ANALYTICS_CONFIG, action);
}
