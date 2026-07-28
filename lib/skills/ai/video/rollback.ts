/** ForgeOS AI video capability — rollback (RC4.7). */

import { VIDEO_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(VIDEO_CONFIG, action);
}
