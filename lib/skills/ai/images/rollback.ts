/** ForgeOS AI images capability — rollback (RC4.7). */

import { IMAGES_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(IMAGES_CONFIG, action);
}
