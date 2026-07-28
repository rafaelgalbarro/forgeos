/** ForgeOS AI vision capability — rollback (RC4.7). */

import { VISION_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(VISION_CONFIG, action);
}
