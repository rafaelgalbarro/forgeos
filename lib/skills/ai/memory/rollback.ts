/** ForgeOS AI memory capability — rollback (RC4.7). */

import { MEMORY_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(MEMORY_CONFIG, action);
}
