/** ForgeOS AI voice capability — rollback (RC4.7). */

import { VOICE_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(VOICE_CONFIG, action);
}
