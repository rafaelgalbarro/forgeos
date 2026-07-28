/** ForgeOS AI embeddings capability — rollback (RC4.7). */

import { EMBEDDINGS_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(EMBEDDINGS_CONFIG, action);
}
