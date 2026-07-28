/** ForgeOS Marketing Automation — rollback (RC4.5). */

import { buildRollbackPlan } from "../shared/create-provider-module";
import { AUTOMATION_CONFIG } from "./registry";

export function buildAutomationRollback(action: string) {
  return buildRollbackPlan(AUTOMATION_CONFIG, action);
}
