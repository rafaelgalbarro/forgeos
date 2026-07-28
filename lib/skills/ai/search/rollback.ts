/** ForgeOS AI search capability — rollback (RC4.7). */

import { SEARCH_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(SEARCH_CONFIG, action);
}
