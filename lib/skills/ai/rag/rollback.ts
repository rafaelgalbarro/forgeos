/** ForgeOS AI rag capability — rollback (RC4.7). */

import { RAG_CONFIG } from "../shared/capabilities";
import { buildRollbackPlan } from "../shared/capability-factory";

export function buildRollback(action: string) {
  return buildRollbackPlan(RAG_CONFIG, action);
}
