/** ForgeOS AI translation capability — rollback (RC4.7). */

import { TRANSLATION_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(TRANSLATION_CONFIG, action);
}
