/** ForgeOS AI audio capability — rollback (RC4.7). */

import { AUDIO_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(AUDIO_CONFIG, action);
}
