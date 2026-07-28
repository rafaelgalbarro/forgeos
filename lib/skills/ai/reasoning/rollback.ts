/** ForgeOS AI reasoning capability — rollback (RC4.7). */

import { REASONING_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(REASONING_CONFIG, action);
}
