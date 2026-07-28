/** ForgeOS AI coding capability — rollback (RC4.7). */

import { CODING_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(CODING_CONFIG, action);
}
